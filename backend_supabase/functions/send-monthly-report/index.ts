import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    let supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    
    const authHeader = req.headers.get("Authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      supabaseKey = authHeader.split(" ")[1]
    }

    if (!supabaseKey) {
      throw new Error("Missing Supabase service role key in Authorization header.")
    }

    const resendKey = Deno.env.get("RESEND_API_KEY")
    if (!resendKey) {
      throw new Error("Missing RESEND_API_KEY. Set it via: supabase secrets set RESEND_API_KEY=xxx")
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Calculate previous month's date range
    const now = new Date()
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const monthName = firstDayLastMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    const fromDate = firstDayLastMonth.toISOString()
    const toDate = firstDayThisMonth.toISOString()

    console.log(`Generating monthly report for: ${monthName} (${fromDate} to ${toDate})`)

    // Optional: test mode — only send to a specific franchise
    let testFranchiseId: string | null = null
    try {
      const body = await req.json()
      testFranchiseId = body?.test_franchise_id || null
    } catch { /* no body = production mode, send to all */ }

    // 1. Fetch franchise owners
    let query = supabase
      .from("profiles")
      .select("franchise_id, name, email, company")
      .not("email", "is", null)

    if (testFranchiseId) {
      query = query.eq("franchise_id", testFranchiseId)
      console.log(`🧪 TEST MODE: Only sending to franchise_id = ${testFranchiseId}`)
    } else {
      query = query.eq("role", "franchise")
    }

    const { data: franchises, error: fError } = await query

    if (fError) throw new Error("Failed to fetch profiles: " + JSON.stringify(fError))
    if (!franchises || franchises.length === 0) {
      return new Response(JSON.stringify({ message: testFranchiseId ? `No franchise found with ID: ${testFranchiseId}` : "No franchise owners found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
      })
    }

    const results: { franchise_id: string; status: string; error?: string }[] = []

    // 2. For each franchise, generate CSV and send email
    for (const franchise of franchises) {
      if (!franchise.franchise_id || !franchise.email) {
        results.push({ franchise_id: franchise.franchise_id || "unknown", status: "skipped", error: "Missing email or franchise_id" })
        continue
      }

      try {
        // Query bills for last month
        const { data: bills, error: bError } = await supabase
          .from("bills_generated")
          .select("*")
          .eq("franchise_id", franchise.franchise_id)
          .gte("created_at", fromDate)
          .lt("created_at", toDate)
          .order("created_at", { ascending: true })

        if (bError) throw new Error(bError.message)

        const safeBills = bills || []
        const billIds = safeBills.map(b => b.id)

        // Query all items for these bills
        let allItems: Record<string, any>[] = []
        if (billIds.length > 0) {
          // If a franchise has thousands of bills, we might need to chunk this in prod, 
          // but Supabase usually handles IN clauses with ~1000 UUIDs fine.
          const { data: items, error: iError } = await supabase
            .from("bills_items_generated")
            .select("*")
            .in("bill_id", billIds)

          if (iError) throw new Error(iError.message)
          allItems = items || []
        }

        // --- CALCULATION LOGIC ---
        const totalBills = safeBills.length
        const totalAmount = safeBills.reduce((sum, b) => sum + Number(b.total ?? 0), 0)
        const upiAmount = safeBills.filter(b => b.payment_mode?.toLowerCase() === "upi").reduce((sum, b) => sum + Number(b.total ?? 0), 0)
        const cashAmount = safeBills.filter(b => b.payment_mode?.toLowerCase() === "cash").reduce((sum, b) => sum + Number(b.total ?? 0), 0)
        const totalDiscount = safeBills.reduce((sum, b) => sum + Number(b.discount ?? 0), 0)

        // Group by Date for Day-wise summary
        const dayMap = new Map<string, { count: number, total: number, upi: number, cash: number, discount: number }>()

        safeBills.forEach(b => {
          const dateStr = new Date(b.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          if (!dayMap.has(dateStr)) {
            dayMap.set(dateStr, { count: 0, total: 0, upi: 0, cash: 0, discount: 0 })
          }
          const day = dayMap.get(dateStr)!
          day.count++
          day.total += Number(b.total ?? 0)
          day.discount += Number(b.discount ?? 0)
          if (b.payment_mode?.toLowerCase() === "upi") day.upi += Number(b.total ?? 0)
          if (b.payment_mode?.toLowerCase() === "cash") day.cash += Number(b.total ?? 0)
        })

        // --- BUILD CSV ---
        let csv = `"COMPANY NAME:","${(franchise.company || franchise.name).replace(/"/g, '""')}"\n`
        csv += `"FRANCHISE ID:","${franchise.franchise_id}"\n`
        csv += `"REPORT PERIOD:","${new Date(fromDate).toLocaleDateString('en-IN')} to ${new Date(new Date(toDate).getTime() - 1).toLocaleDateString('en-IN')}"\n`
        csv += `"GENERATED ON:","${new Date().toLocaleDateString('en-IN')}"\n\n`

        // 1. Overall Summary
        csv += `"OVERALL MONTHLY SUMMARY"\n`
        csv += `"Total Revenue (INR):","${totalAmount.toFixed(2)}"\n`
        csv += `"Total Bills:","${totalBills}"\n`
        csv += `"UPI Payments (INR):","${upiAmount.toFixed(2)}"\n`
        csv += `"Cash Payments (INR):","${cashAmount.toFixed(2)}"\n`
        csv += `"Total Discounts (INR):","${totalDiscount.toFixed(2)}"\n\n`

        // 2. Day-wise Summary
        csv += `"DAY-WISE SUMMARY"\n`
        csv += `"Date","Total Bills","UPI Revenue","Cash Revenue","Daily Total","Daily Discounts"\n`
        Array.from(dayMap.entries()).forEach(([date, stats]) => {
          csv += `"${date}","${stats.count}","${stats.upi.toFixed(2)}","${stats.cash.toFixed(2)}","${stats.total.toFixed(2)}","${stats.discount.toFixed(2)}"\n`
        })
        csv += `\n`

        // 3. Detailed Itemized Ledger
        csv += `"DETAILED CONSOLIDATED AUDIT TRAIL"\n`
        csv += `"S.No","Date","Time","Bill Number","Payment Mode","Item Name","Qty","Price (INR)","Item Total (INR)","Bill Discount (INR)","Bill Final Amount (INR)"\n`

        if (safeBills.length > 0) {
          safeBills.forEach((bill, index) => {
            const dateObj = new Date(bill.created_at)
            const dateStr = dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            const timeStr = dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
            const discount = Number(bill.discount ?? 0).toFixed(2)
            const finalTotal = Number(bill.total ?? 0).toFixed(2)
            const mode = String(bill.payment_mode || "N/A").toUpperCase()
            const txnId = String(bill.id).replace(/"/g, '""')

            // Get items for this bill
            const billItems = allItems.filter(item => item.bill_id === bill.id)

            if (billItems.length === 0) {
              // Bill with no items (fallback)
              csv += `"${index + 1}","${dateStr}","${timeStr}","${txnId}","${mode}","N/A","0","0.00","0.00","${discount}","${finalTotal}"\n`
            } else {
              // Print first item with the main bill info
              billItems.forEach((item, i) => {
                const itemName = String(item.item_name || "Unknown").replace(/"/g, '""')
                const qty = item.qty || 0
                const price = Number(item.price ?? 0).toFixed(2)
                const itemTotal = Number(item.total ?? (qty * Number(price))).toFixed(2)

                if (i === 0) {
                  // Row 1: Includes all bill-level metadata
                  csv += `"${index + 1}","${dateStr}","${timeStr}","${txnId}","${mode}","${itemName}","${qty}","${price}","${itemTotal}","${discount}","${finalTotal}"\n`
                } else {
                  // Subsequent rows: Blank out bill-level metadata so it visually groups under the same bill in Excel
                  csv += `"" ,"" ,"" ,"" ,"" ,"${itemName}","${qty}","${price}","${itemTotal}","" ,"" \n`
                }
              })
            }
          })
        }

        // Convert CSV to base64 for Resend attachment
        const csvBase64 = btoa(unescape(encodeURIComponent(csv)))

        // Send email via Resend
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "JKSH United <noreply@jkshunited.com>",
            to: franchise.email,
            subject: `Monthly Sales Report — ${monthName}`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #006437;">Monthly Sales Report</h2>
                <p>Hi <strong>${franchise.name}</strong>,</p>
                <p>Please find attached your sales report for <strong>${monthName}</strong>.</p>
                <table style="border-collapse: collapse; margin: 20px 0;">
                  <tr><td style="padding: 8px 16px; background: #f3f4f6; font-weight: bold;">Total Bills</td><td style="padding: 8px 16px;">${totalBills}</td></tr>
                  <tr><td style="padding: 8px 16px; background: #f3f4f6; font-weight: bold;">Total Revenue</td><td style="padding: 8px 16px;">₹${totalAmount.toFixed(2)}</td></tr>
                  <tr><td style="padding: 8px 16px; background: #f3f4f6; font-weight: bold;">UPI</td><td style="padding: 8px 16px;">₹${upiAmount.toFixed(2)}</td></tr>
                  <tr><td style="padding: 8px 16px; background: #f3f4f6; font-weight: bold;">Cash</td><td style="padding: 8px 16px;">₹${cashAmount.toFixed(2)}</td></tr>
                </table>
                <p style="color: #6b7280; font-size: 12px;">This is an automated report from JKSH United. For detailed transactions, please check the attached CSV file.</p>
              </div>
            `,
            attachments: [{
              content: csvBase64,
              filename: `Sales_Report_${monthName.replace(/\s/g, "_")}_${franchise.franchise_id}.csv`,
            }],
          }),
        })

        const emailData = await emailRes.json()
        if (!emailRes.ok) throw new Error(emailData.message || "Resend failed")

        results.push({ franchise_id: franchise.franchise_id, status: "sent" })
        console.log(`✅ Report sent to ${franchise.email} (${franchise.franchise_id})`)

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        results.push({ franchise_id: franchise.franchise_id, status: "failed", error: msg })
        console.error(`❌ Failed for ${franchise.franchise_id}: ${msg}`)
      }
    }

    return new Response(JSON.stringify({ month: monthName, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("CRITICAL ERROR:", message)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500
    })
  }
})
