// Shared header styles used across dashboard/management pages

export const headerStyles = {
    header: {
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        position: 'relative',
        zIndex: 30,
        width: '100%',
        marginBottom: '24px',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    },
    headerInner: {
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        gap: '12px',
        boxSizing: 'border-box'
    },
    backBtn: {
        background: "none",
        border: "none",
        color: "#000",
        fontSize: "14px",
        fontWeight: "700",
        cursor: "pointer",
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexShrink: 0
    },
    heading: {
        fontWeight: "900",
        color: "#000",
        textTransform: 'uppercase',
        letterSpacing: "-0.5px",
        margin: 0,
        fontSize: '20px',
        textAlign: 'center',
        flex: 1,
        lineHeight: 1.2
    },
    idBox: {
        background: '#f1f5f9',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        padding: '6px 12px',
        color: '#334155',
        fontSize: '11px',
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        whiteSpace: 'nowrap',
        flexShrink: 0
    }
};
