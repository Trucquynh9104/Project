function DateRangeFilter({
  className = '',
  fromDate,
  onFromDateChange,
  onToDateChange,
  toDate,
}) {
  function clearRange() {
    onFromDateChange('')
    onToDateChange('')
  }

  return (
    <div className={`cashier-date-range-filter ${className}`.trim()}>
      <label>
        <span>Từ ngày</span>
        <input
          aria-label="Từ ngày"
          max={toDate || undefined}
          type="date"
          value={fromDate}
          onChange={(event) => onFromDateChange(event.target.value)}
        />
      </label>
      <b aria-hidden="true">–</b>
      <label>
        <span>Đến ngày</span>
        <input
          aria-label="Đến ngày"
          min={fromDate || undefined}
          type="date"
          value={toDate}
          onChange={(event) => onToDateChange(event.target.value)}
        />
      </label>
      {(fromDate || toDate) && (
        <button aria-label="Xóa bộ lọc ngày" title="Xóa bộ lọc ngày" type="button" onClick={clearRange}>×</button>
      )}
    </div>
  )
}

export default DateRangeFilter
