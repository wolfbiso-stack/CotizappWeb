import React from 'react';

/**
 * High-fidelity vector logos for CUBI Servicios partner & supported hardware brands.
 * All marks, logos and trade names belong to their respective corporate owners.
 */

export const BrandLogos = {
    Hikvision: ({ className = "h-8 w-auto" }) => (
        <svg viewBox="0 0 240 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Hikvision">
            {/* HIK in Red */}
            <g fill="#E51C24">
                {/* H */}
                <path d="M10 8h9.5v13.5h16V8H45v34h-9.5V29.5h-16V42H10V8z" />
                {/* I */}
                <path d="M51 8h9.5v34H51V8z" />
                {/* K */}
                <path d="M67 8h9.5v13.8L93 8h12.5l-19 18.2L106.5 42H93.2l-16.7-15.5V42H67V8z" />
            </g>
            {/* VISION in Charcoal/Black */}
            <g fill="#1F2429">
                {/* V */}
                <path d="M109 8h9.8l10.2 24.8L139.2 8h9.8L133.5 42h-9.8L109 8z" />
                {/* I */}
                <path d="M153 8h9.5v34h-9.5V8z" />
                {/* S */}
                <path d="M168 33.2c1.8 1.8 4.6 3 7.8 3 4.2 0 6.6-2 6.6-4.6 0-3-2.5-4.2-7.5-5.6-7.2-2-10.8-4.8-10.8-10.5 0-6.2 5.2-10.5 13.2-10.5 5.5 0 9.8 1.8 12.8 4.6l-4.5 6.2c-2.2-1.8-5-2.8-8.2-2.8-3.6 0-5.8 1.6-5.8 4 0 2.6 2.2 3.6 7 5 7.6 2.2 11.2 5 11.2 11 0 6.8-5.6 11-14 11-6.5 0-11.8-2.2-15.2-5.8l4.4-6z" />
                {/* I */}
                <path d="M193 8h9.5v34h-9.5V8z" />
                {/* O */}
                <path d="M207 25c0-9.8 7.2-17 17.5-17s17.5 7.2 17.5 17-7.2 17-17.5 17S207 34.8 207 25zm25.5 0c0-5.2-3.5-9-8-9s-8 3.8-8 9 3.5 9 8 9 8-3.8 8-9z" />
                {/* N */}
                <path d="M246 8h9.2l15.5 21V8h9.5v34h-9.2l-15.5-21v21H246V8z" />
            </g>
        </svg>
    ),

    Dahua: ({ className = "h-8 w-auto" }) => (
        <svg viewBox="0 0 200 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Dahua Technology">
            <g fill="#E60012">
                {/* d */}
                <path d="M28 5v14.2c-2.4-2.2-5.4-3.4-9.2-3.4-8 0-14.8 6.5-14.8 15.5S10.8 47 18.8 47c3.8 0 6.8-1.2 9.2-3.4V46H34V5H28zm-7.6 35.5c-5 0-8.8-3.8-8.8-9.2s3.8-9.2 8.8-9.2 8.8 3.8 8.8 9.2-3.8 9.2-8.8 9.2z" />
                {/* a */}
                <path d="M54.5 16.5c-7.5 0-13.5 5.5-13.5 15s6 15 13.5 15c4.2 0 7.4-1.6 9.5-4.2V46h5.8V23.5c0-4.5-3.5-7-9.5-7h-5.8zm3.2 24.2c-4.8 0-8.2-3.5-8.2-8.8s3.4-8.8 8.2-8.8 8.2 3.5 8.2 8.8-3.4 8.8-8.2 8.8z" />
                {/* h */}
                <path d="M74 5v41h5.8V30.5c0-5 3.2-8.2 7.8-8.2 4.2 0 6.5 2.8 6.5 7.2V46h5.8V28.5c0-7.2-4.2-11.5-10.5-11.5-4.2 0-7.5 1.8-9.5 4.8V5H74z" />
                {/* u */}
                <path d="M123.5 17.5h-5.8v15.2c0 5-3 8-7.5 8-4.2 0-6.8-2.8-6.8-7.5V17.5h-5.8V34c0 7.5 4.5 12 11.5 12 4.2 0 7.2-1.6 9.2-4.5V46h5.8l-.6-28.5z" />
                {/* a */}
                <path d="M141.5 16.5c-7.5 0-13.5 5.5-13.5 15s6 15 13.5 15c4.2 0 7.4-1.6 9.5-4.2V46h5.8V23.5c0-4.5-3.5-7-9.5-7h-5.8zm3.2 24.2c-4.8 0-8.2-3.5-8.2-8.8s3.4-8.8 8.2-8.8 8.2 3.5 8.2 8.8-3.4 8.8-8.2 8.8z" />
            </g>
            <text x="162" y="32" fill="#202428" fontSize="10" fontWeight="900" letterSpacing="1.5" fontFamily="sans-serif">
                TECHNOLOGY
            </text>
        </svg>
    ),

    Tiandy: ({ className = "h-7 w-auto" }) => (
        <svg viewBox="0 0 170 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Tiandy">
            <g fill="#E50012">
                {/* T */}
                <path d="M8 8h32v8.5H28.5v28H17.5v-28H8V8z" />
                {/* i */}
                <circle cx="48" cy="11" r="5" />
                <path d="M43 19h10v25.5H43V19z" />
                {/* a */}
                <path d="M72 18c-7.5 0-13 5.5-13 13.5s5.5 13.5 13 13.5c4 0 7-1.5 9-3.8v3.3h9.5V27.5c0-5.8-4-9.5-10.5-9.5h-8zm2.5 20c-4 0-6.8-2.8-6.8-7s2.8-7 6.8-7 6.8 2.8 6.8 7-2.8 7-6.8 7z" />
                {/* n */}
                <path d="M96 19h9.5v3.8c2-2.8 5-4.3 9-4.3 6 0 9.5 3.8 9.5 10V44.5h-9.5v-14c0-3.5-1.8-5.2-4.8-5.2-3.2 0-5.2 2.2-5.2 5.8v13.4H96V19z" />
                {/* d */}
                <path d="M143 8h9.5v36.5H143v-3.5c-2 2.5-5 4-9 4-7.5 0-13-5.5-13-13.5s5.5-13.5 13-13.5c4 0 7 1.5 9 4V8zm-6.5 30.5c4 0 6.8-2.8 6.8-7s-2.8-7-6.8-7-6.8 2.8-6.8 7 2.8 7 6.8 7z" />
                {/* y */}
                <path d="M157 19h10l6.5 18 6.5-18H190l-12 30c-2.5 6-6.5 9-13 9h-4v-7.5h2.5c3 0 4.8-1.2 6-4.5l-12.5-27z" />
            </g>
        </svg>
    ),

    Epcom: ({ className = "h-8 w-auto" }) => (
        <svg viewBox="0 0 160 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Epcom">
            <g fill="#004A99">
                {/* E */}
                <path d="M10 8h28v7H18v7h18v6.5H18v8.5h20.5V44H10V8z" />
                {/* P */}
                <path d="M42 8h18c7 0 12 4.5 12 11.5s-5 11.5-12 11.5H50V44h-8V8zm8 16h9.5c3.5 0 5.8-2 5.8-5s-2.3-5-5.8-5H50v10z" />
                {/* C */}
                <path d="M96 26c0-10.5 7.5-18.5 18-18.5 6.5 0 11.5 2.8 14.5 7.5l-5.5 4.5c-2.2-3.2-5-5-9-5-6 0-10 4.8-10 11.5s4 11.5 10 11.5c4 0 6.8-1.8 9-5l5.5 4.5c-3 4.8-8 7.5-14.5 7.5-10.5 0-18-8-18-18.5z" />
                {/* O */}
                <path d="M132 26c0-10.5 7.5-18.5 18-18.5s18 8 18 18.5-7.5 18.5-18 18.5-18-8-18-18.5zm27.8 0c0-6.8-4-11.8-9.8-11.8s-9.8 5-9.8 11.8 4 11.8 9.8 11.8 9.8-5 9.8-11.8z" />
                {/* M */}
                <path d="M172 8h8.5l10 16 10-16h8.5V44h-7.5V22l-8.5 13.5h-5L179.5 22V44H172V8z" />
            </g>
        </svg>
    ),

    Intel: ({ className = "h-8 w-auto" }) => (
        <svg viewBox="0 0 130 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Intel">
            <g fill="#0068B5">
                {/* i dot (cyan) */}
                <rect x="12" y="8" width="8.5" height="8.5" rx="1.5" fill="#00C7FD" />
                {/* i stem */}
                <rect x="12" y="19" width="8.5" height="23" rx="1.5" />
                {/* n */}
                <path d="M26 19h8v3.2c2.2-2.5 5.5-3.8 9.5-3.8 6.5 0 10.5 4 10.5 11V42h-8.5v-11c0-3.5-1.8-5.2-4.8-5.2-3.2 0-5.2 2-5.2 5.5V42H26V19z" />
                {/* t */}
                <path d="M64 12v7h7v6.5h-7v10c0 2 .8 2.8 2.5 2.8h4.5V42h-6.5c-5 0-8.5-2.5-8.5-7.5V25.5h-5V19h5v-7h8z" />
                {/* e */}
                <path d="M84.5 18.5c-7.5 0-13 5.5-13 12s5.5 12 13 12c5 0 8.8-2 11-5.5l-6-3.5c-1.2 1.8-3 2.8-5 2.8-3 0-5.2-1.8-5.5-4.5H98c.2-.8.2-1.5.2-2 0-6.8-5-11.3-13.7-11.3zm-5.5 9c.5-2.8 2.5-4.5 5.5-4.5s5 1.8 5.5 4.5H79z" />
                {/* l */}
                <rect x="102" y="8" width="8.5" height="34" rx="1.5" />
            </g>
        </svg>
    ),

    AMD: ({ className = "h-8 w-auto" }) => (
        <svg viewBox="0 0 160 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="AMD">
            {/* Iconic Green Arrow Chevron */}
            <g fill="#008A00">
                <path d="M8 8h15.5l9 9-9 9H8V8z" />
                <path d="M26 23.5l11.5 11.5H8v-7h22l-4-4.5z" />
                <path d="M38.5 8v16l-8-8 8-8z" />
            </g>
            {/* Bold AMD Lettering */}
            <g fill="#111827">
                {/* A */}
                <path d="M52 42h9.5l3.5-9.5h15l3.5 9.5H93L76.5 8h-8L52 42zm15.5-17L72 13l4.5 12h-9z" />
                {/* M */}
                <path d="M96 8v34h8.5V21l8 14h5l8-14v21H134V8h-9l-6.5 12.5L105 8H96z" />
                {/* D */}
                <path d="M138 8v34h15c9.5 0 16.5-6.5 16.5-17s-7-17-16.5-17h-15zm9 26.5V15.5h6c5 0 8.5 3.5 8.5 9s-3.5 9-8.5 9h-6z" />
            </g>
        </svg>
    ),

    Ubiquiti: ({ className = "h-8 w-auto" }) => (
        <svg viewBox="0 0 180 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Ubiquiti Networks">
            {/* Ubiquiti Hexagon Shield Icon */}
            <g fill="#006FFF">
                <path d="M22 6l14 8v16l-14 8-14-8V14l14-8zm0 5l-9.5 5.5v11L22 33l9.5-5.5v-11L22 11z" />
                <path d="M22 16c-3 0-5.5 2.5-5.5 5.5v4.5c0 3 2.5 5.5 5.5 5.5s5.5-2.5 5.5-5.5v-4.5c0-3-2.5-5.5-5.5-5.5zm2 10c0 1.2-.8 2-2 2s-2-.8-2-2v-4.5c0-1.2.8-2 2-2s2 .8 2 2V26z" />
            </g>
            {/* Wordmark */}
            <text x="46" y="29" fill="#002D5A" fontSize="17" fontWeight="900" letterSpacing="2.5" fontFamily="sans-serif">
                UBIQUITI
            </text>
        </svg>
    ),

    ZKTeco: ({ className = "h-8 w-auto" }) => (
        <svg viewBox="0 0 170 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="ZKTeco">
            {/* ZK in Vibrant Green */}
            <g fill="#7BB642">
                {/* Z */}
                <path d="M10 10h22v7.5L19 32.5h13V40H10v-7.5l13-15H10V10z" />
                {/* K */}
                <path d="M36 10h8v11.5L56 10h10L52 23.5 66.5 40h-10L44 26v14h-8V10z" />
            </g>
            {/* Teco in Slate Navy */}
            <g fill="#1E293B">
                <text x="70" y="36" fontSize="26" fontWeight="900" letterSpacing="0.5" fontFamily="sans-serif">
                    Teco
                </text>
            </g>
        </svg>
    ),

    Yonusa: ({ className = "h-8 w-auto" }) => (
        <svg viewBox="0 0 170 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Yonusa">
            {/* Lightning bolt badge */}
            <polygon points="12,23 24,6 20,20 30,20 16,40 20,25" fill="#E52320" />
            {/* Bold Wordmark */}
            <text x="36" y="32" fill="#E52320" fontSize="23" fontWeight="900" fontStyle="italic" letterSpacing="1" fontFamily="sans-serif">
                YONUSA
            </text>
            <text x="135" y="18" fill="#1E293B" fontSize="9" fontWeight="800" fontFamily="sans-serif">
                ®
            </text>
        </svg>
    ),

    TPLink: ({ className = "h-8 w-auto" }) => (
        <svg viewBox="0 0 165 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="TP-Link">
            {/* Teal curved loop icon */}
            <g fill="#00A4A6">
                <path d="M10 22c0-6.6 5.4-12 12-12h7v6h-7c-3.3 0-6 2.7-6 6s2.7 6 6 6h7v6h-7c-6.6 0-12-5.4-12-12z" />
                <path d="M37 22c0 6.6-5.4 12-12 12h-7v-6h7c3.3 0 6-2.7 6-6s-2.7-6-6-6h-7v-6h7c6.6 0 12 5.4 12 12z" />
            </g>
            {/* tp-link lowercase font */}
            <g fill="#21272A">
                <text x="44" y="30" fontSize="21" fontWeight="700" letterSpacing="-0.5" fontFamily="sans-serif">
                    tp-link
                </text>
            </g>
        </svg>
    ),

    Epson: ({ className = "h-8 w-auto" }) => (
        <svg viewBox="0 0 160 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Epson">
            <g fill="#003399">
                <text x="6" y="33" fontSize="30" fontWeight="900" letterSpacing="1.5" fontFamily="serif">
                    EPSON
                </text>
            </g>
        </svg>
    ),

    HP: ({ className = "h-8 w-auto" }) => (
        <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="HP">
            {/* Blue Circle */}
            <circle cx="30" cy="30" r="28" fill="#0096D6" />
            {/* Stylized slanted 4-line hp logo */}
            <g fill="#FFFFFF">
                {/* h stem */}
                <polygon points="20,12 25,12 15,48 10,48" />
                {/* h curve & p stem */}
                <polygon points="24,24 29,24 23,48 18,48" />
                <polygon points="34,12 39,12 29,48 24,48" />
                <polygon points="40,24 45,24 39,48 34,48" />
            </g>
        </svg>
    ),

    WesternDigital: ({ className = "h-8 w-auto" }) => (
        <svg viewBox="0 0 190 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Western Digital">
            {/* WD Blue Box */}
            <rect x="6" y="8" width="34" height="28" rx="4" fill="#00529B" />
            <text x="11" y="29" fill="#FFFFFF" fontSize="17" fontWeight="900" fontFamily="sans-serif">
                WD
            </text>
            {/* Western Digital Text */}
            <g fill="#1F2937">
                <text x="46" y="24" fontSize="13" fontWeight="900" letterSpacing="0.5" fontFamily="sans-serif">
                    Western Digital
                </text>
                <text x="46" y="35" fill="#7C3AED" fontSize="9" fontWeight="800" letterSpacing="1" fontFamily="sans-serif">
                    PURPLE™ · CCTV SURVEILLANCE
                </text>
            </g>
        </svg>
    ),

    Kingston: ({ className = "h-8 w-auto" }) => (
        <svg viewBox="0 0 170 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Kingston Technology">
            {/* Kingston Red Rex Face Silhouette */}
            <path d="M8 35l4-22 10-5 6 4-3 9 7 2-4 12-20 0z" fill="#E31B23" />
            <circle cx="21" cy="18" r="2.5" fill="#FFFFFF" />
            {/* Wordmark */}
            <g fill="#111827">
                <text x="36" y="27" fontSize="18" fontWeight="800" letterSpacing="0.5" fontFamily="serif">
                    Kingston
                </text>
                <text x="37" y="37" fill="#6B7280" fontSize="8" fontWeight="700" letterSpacing="1.5" fontFamily="sans-serif">
                    TECHNOLOGY
                </text>
            </g>
        </svg>
    ),

    HiLook: ({ className = "h-7 w-auto" }) => (
        <svg viewBox="0 0 185 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="HiLook by Hikvision">
            <text x="6" y="30" fill="#64748B" fontSize="27" fontWeight="800" fontFamily="sans-serif" letterSpacing="-0.5">
                Hi
            </text>
            <text x="36" y="30" fill="#1987C6" fontSize="27" fontWeight="800" fontFamily="sans-serif" letterSpacing="-0.5">
                Look
            </text>
            <text x="48" y="43" fill="#64748B" fontSize="9.5" fontWeight="700" fontFamily="sans-serif">
                by
            </text>
            <text x="63" y="43" fill="#E51C24" fontSize="10" fontWeight="900" fontStyle="italic" fontFamily="sans-serif" letterSpacing="0.5">
                HIK
            </text>
            <text x="84" y="43" fill="#64748B" fontSize="10" fontWeight="900" fontStyle="italic" fontFamily="sans-serif" letterSpacing="0.5">
                VISION
            </text>
        </svg>
    ),

    SEG: ({ className = "h-7 w-auto" }) => (
        <svg viewBox="0 0 140 46" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="SEG México">
            <text x="8" y="33" fill="#E51C24" fontSize="31" fontWeight="900" fontStyle="italic" fontFamily="sans-serif" letterSpacing="1">
                SEG
            </text>
            <rect x="10" y="36" width="95" height="3" fill="#1E293B" />
        </svg>
    ),

    Ruijie: ({ className = "h-7 w-auto" }) => (
        <svg viewBox="0 0 155 46" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Ruijie Networks">
            <text x="8" y="33" fill="#E60012" fontSize="28" fontWeight="900" fontStyle="italic" fontFamily="sans-serif" letterSpacing="0.5">
                Ruijie
            </text>
        </svg>
    ),

    Seagate: ({ className = "h-7 w-auto" }) => (
        <svg viewBox="0 0 185 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Seagate">
            <circle cx="22" cy="23" r="13" stroke="#6DBE45" strokeWidth="3.5" />
            <path d="M16 23c0-3.5 2.8-6 6-6s6 2.5 6 6-2.8 6-6 6" stroke="#6DBE45" strokeWidth="3" strokeLinecap="round" />
            <text x="44" y="29" fill="#334155" fontSize="19" fontWeight="700" letterSpacing="2" fontFamily="sans-serif">
                Seagate
            </text>
        </svg>
    ),

    Belden: ({ className = "h-7 w-auto" }) => (
        <svg viewBox="0 0 165 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Belden">
            <text x="8" y="32" fill="#004990" fontSize="26" fontWeight="900" letterSpacing="1.5" fontFamily="sans-serif">
                BELDEN
            </text>
        </svg>
    )
};

export default BrandLogos;
