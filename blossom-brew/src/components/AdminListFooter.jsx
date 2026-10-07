function AdminListFooter({
  currentPage,
  itemLabel,
  onPageChange,
  totalItems,
  totalPages,
}) {
  const buttonStyle = {
    background: '#fff',
    border: '1px solid #dfcfc3',
    color: '#765747',
    height: '26px',
    width: '26px',
    fontSize: '14px',
  }

  return (
    <div
      style={{
        alignItems: 'center',
        borderTop: '1px solid #eadfd5',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        justifyContent: 'space-between',
        minHeight: '42px',
        padding: '0 12px',
      }}
    >
      <span style={{ color: '#806858', fontSize: '11px' }}>
        Tổng số {itemLabel}:{' '}
        <strong style={{ color: '#50382c' }}>{totalItems}</strong>
      </span>

      <div style={{ alignItems: 'center', display: 'flex', gap: '6px' }}>
        <button
          aria-label="Trang trước"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          style={{
            ...buttonStyle,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.4 : 1,
          }}
          type="button"
        >
          {'<'}
        </button>

        <span style={{ color: '#806858', fontSize: '11px' }}>
          Trang {currentPage} / {totalPages}
        </span>

        <button
          aria-label="Trang sau"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          style={{
            ...buttonStyle,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.4 : 1,
          }}
          type="button"
        >
          {'>'}
        </button>
      </div>
    </div>
  )
}

export default AdminListFooter
