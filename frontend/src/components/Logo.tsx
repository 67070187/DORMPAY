/**
 * โลโก้ DORM-PAY: ตึกหอพักแบบแฟลต (ตึกกลางหลังคาจั่ว + ปีกสองข้าง) บนพื้นม่วง
 * วาดเป็น SVG ล้วน คมทุกขนาด ใช้ร่วมกับไฟล์ favicon (src/app/icon.svg)
 */
export default function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="DORM-PAY"
    >
      <defs>
        <linearGradient id="dp-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d6af5" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#dp-bg)" />

      {/* ปีกซ้าย-ขวา (สีจางกว่าเพื่อให้ดูมีมิติ) */}
      <path d="M11 25.5 17 21l6 4.5V51H11z" fill="#e0e7ff" />
      <path d="M41 23.5 47 19l6 4.5V51H41z" fill="#e0e7ff" />
      {/* หลังคาปีก */}
      <path d="M9.5 26 17 20.2 24.5 26" fill="none" stroke="#fb923c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M39.5 24 47 18.2 54.5 24" fill="none" stroke="#fb923c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

      {/* ตึกกลาง + หลังคาจั่ว */}
      <path d="M21 17 32 9.5 43 17V51H21z" fill="#ffffff" />
      <path d="M18.5 18 32 8.5 45.5 18" fill="none" stroke="#fb923c" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />

      {/* หน้าต่างตึกกลาง 2 แถว x 4 ชั้น */}
      <g fill="#4f46e5">
        {[20, 26, 32, 38].map((y) => (
          <g key={y}>
            <rect x="25" y={y} width="5" height="3.6" rx="1" />
            <rect x="34" y={y} width="5" height="3.6" rx="1" />
          </g>
        ))}
      </g>

      {/* ระเบียงปีกข้าง (เส้นแนวนอน) */}
      <g stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round">
        {[30, 36, 42].map((y) => (
          <g key={y}>
            <line x1="13.5" y1={y} x2="20.5" y2={y} />
            <line x1="43.5" y1={y} x2="50.5" y2={y} />
          </g>
        ))}
      </g>

      {/* ประตูทางเข้า */}
      <rect x="28.5" y="44" width="7" height="7" rx="1.5" fill="#fb923c" />
      {/* พื้น */}
      <rect x="8" y="50.5" width="48" height="3" rx="1.5" fill="#ffffff" />
    </svg>
  );
}
