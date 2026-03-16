import React from 'react'

const PATHS = {
  health:   <path d="M8 14C8 14 2 10 2 6C2 4 4 2 6 2C7 2 8 3 8 3C8 3 9 2 10 2C12 2 14 4 14 6C14 10 8 14 8 14Z" />,
  sport:    <><circle cx="8" cy="8" r="6" fill="none" strokeWidth="1.5"/><path d="M4 4L8 8L12 4M8 8V13" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
  work:     <><rect x="2" y="6" width="12" height="8" rx="2" fill="none" strokeWidth="1.5"/><path d="M5 6V4C5 3 6 2 8 2C10 2 11 3 11 4V6" fill="none" strokeWidth="1.5" strokeLinecap="round"/></>,
  creative: <path d="M8 2L9.5 6L14 6.5L11 9.5L12 14L8 11.5L4 14L5 9.5L2 6.5L6.5 6Z" fill="none" strokeWidth="1.3" strokeLinejoin="round"/>,
  learn:    <path d="M2 4L8 2L14 4V8C14 11 11 13.5 8 14.5C5 13.5 2 11 2 8V4Z" fill="none" strokeWidth="1.4" strokeLinejoin="round"/>,
  finance:  <><circle cx="8" cy="8" r="6" fill="none" strokeWidth="1.4"/><text x="8" y="11.5" textAnchor="middle" fontSize="8" fontFamily="sans-serif" stroke="none">€</text></>,
  travel:   <><path d="M8 2C5.8 2 4 3.8 4 6C4 9 8 14 8 14C8 14 12 9 12 6C12 3.8 10.2 2 8 2Z" fill="none" strokeWidth="1.4"/><circle cx="8" cy="6" r="1.5" fill="none" strokeWidth="1.2"/></>,
  social:   <><circle cx="6" cy="5" r="2.5" fill="none" strokeWidth="1.3"/><circle cx="11" cy="7" r="2" fill="none" strokeWidth="1.2"/><path d="M1 13C1 11 3 9.5 6 9.5C7.2 9.5 8.3 9.8 9.1 10.3" fill="none" strokeWidth="1.3" strokeLinecap="round"/><path d="M9 13.5C9 12 9.8 11 11 11C12.2 11 13 12 13 13.5" fill="none" strokeWidth="1.2" strokeLinecap="round"/></>,
  home:     <path d="M2 7L8 2L14 7V14H10V10H6V14H2V7Z" fill="none" strokeWidth="1.3" strokeLinejoin="round"/>,
  book:     <><path d="M3 2H10C11.1 2 12 2.9 12 4V13C12 14.1 11.1 15 10 15H3V2Z" fill="none" strokeWidth="1.3"/><line x1="5" y1="6" x2="10" y2="6" strokeWidth="1.2" strokeLinecap="round"/><line x1="5" y1="8.5" x2="10" y2="8.5" strokeWidth="1.2" strokeLinecap="round"/><path d="M12 4C12 4 12.5 2 14 2V13C12.5 13 12 13 12 13" fill="none" strokeWidth="1.2"/></>,
  music:    <><path d="M6 12V4L13 3V11" fill="none" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="4.5" cy="12" r="1.5" fill="none" strokeWidth="1.2"/><circle cx="11.5" cy="11" r="1.5" fill="none" strokeWidth="1.2"/></>,
  mind:     <><circle cx="8" cy="8" r="5.5" fill="none" strokeWidth="1.3"/><path d="M5 8C5 8 5.5 10 8 10C10.5 10 11 8 11 8" fill="none" strokeWidth="1.2" strokeLinecap="round"/><circle cx="6" cy="6.5" r="0.7"/><circle cx="10" cy="6.5" r="0.7"/></>,
  code:     <><path d="M5 5L2 8L5 11" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M11 5L14 8L11 11" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><line x1="9" y1="4" x2="7" y2="12" strokeWidth="1.3" strokeLinecap="round"/></>,
  food:     <><path d="M5 2V6C5 7.7 6.3 9 8 9C9.7 9 11 7.7 11 6V2" fill="none" strokeWidth="1.3" strokeLinecap="round"/><line x1="8" y1="9" x2="8" y2="14" strokeWidth="1.4" strokeLinecap="round"/><line x1="5.5" y1="14" x2="10.5" y2="14" strokeWidth="1.4" strokeLinecap="round"/></>,
  nature:   <><path d="M8 2C5 2 3 5 4 8C5 11 8 14 8 14" fill="none" strokeWidth="1.3" strokeLinecap="round"/><path d="M8 14C8 14 11 11 12 8C13 5 11 2 8 2" fill="none" strokeWidth="1.3" strokeLinecap="round"/><line x1="8" y1="8" x2="8" y2="14" strokeWidth="1.3" strokeLinecap="round"/></>,
  photo:    <><rect x="1.5" y="4" width="13" height="9" rx="2" fill="none" strokeWidth="1.3"/><circle cx="8" cy="8.5" r="2.5" fill="none" strokeWidth="1.2"/><path d="M5.5 4L6.5 2H9.5L10.5 4" fill="none" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></>,
}

export default function ChapterIcon({ icon = 'health', accent = '#1D9E75', size = 16, filled = false }) {
  const content = PATHS[icon] || PATHS.health
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 16 16"
      fill={filled ? accent : 'none'}
      stroke={accent}
      strokeWidth="1.3"
      xmlns="http://www.w3.org/2000/svg"
    >
      {content}
    </svg>
  )
}
