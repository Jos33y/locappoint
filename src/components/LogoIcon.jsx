// LogoIcon.jsx - SVG Logo Icon Component
// Location: src/components/LogoIcon.jsx

const LogoIcon = ({ size = 32, className = '' }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        {/* Cloud shape */}
        <path 
            d="M8 20C5.79 20 4 18.21 4 16C4 14.14 5.28 12.59 7 12.14C7 12.09 7 12.05 7 12C7 9.24 9.24 7 12 7C13.86 7 15.46 8.12 16.25 9.69C16.65 9.56 17.07 9.5 17.5 9.5C19.71 9.5 21.5 11.29 21.5 13.5C21.5 13.67 21.49 13.84 21.46 14H22C24.21 14 26 15.79 26 18C26 20.21 24.21 22 22 22H8V20Z" 
            fill="url(#cloud-gradient)"
            opacity="0.6"
        />
        {/* Padlock body */}
        <rect 
            x="11" 
            y="14" 
            width="10" 
            height="9" 
            rx="2" 
            stroke="url(#lock-gradient)" 
            strokeWidth="2"
            fill="none"
        />
        {/* Padlock shackle */}
        <path 
            d="M13 14V11C13 9.34 14.34 8 16 8C17.66 8 19 9.34 19 11V14" 
            stroke="url(#lock-gradient)" 
            strokeWidth="2" 
            strokeLinecap="round"
            fill="none"
        />
        {/* Keyhole */}
        <circle cx="16" cy="18" r="1.5" fill="url(#lock-gradient)" />
        {/* Gradients */}
        <defs>
            <linearGradient id="cloud-gradient" x1="4" y1="7" x2="26" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#06B6D4" />
                <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
            <linearGradient id="lock-gradient" x1="11" y1="8" x2="21" y2="23" gradientUnits="userSpaceOnUse">
                <stop stopColor="#8B5CF6" />
                <stop offset="1" stopColor="#06B6D4" />
            </linearGradient>
        </defs>
    </svg>
)

export default LogoIcon