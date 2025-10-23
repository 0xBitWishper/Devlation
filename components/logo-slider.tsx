import React from "react";

// Logo list, change src to match logos available in /public
const logos = [
  { src: "/devlation.png", alt: "Devlation" },
  { src: "/devlation_circle.png", alt: "Devlation Circle" },
  // Tambahkan logo lain di sini
];

export default function LogoSlider() {
  return (
    <div className="w-full py-8 overflow-hidden">
      <div className="relative w-full h-20 flex items-center" style={{ minHeight: '5rem' }}>
        <div className="flex gap-12 w-full justify-center items-center" style={{ height: '100%' }}>
          {logos.map((logo, idx) => (
            <div key={idx} className="flex items-center justify-center h-full">
              <img
                src={logo.src}
                alt={logo.alt}
                className="h-12 w-auto grayscale hover:grayscale-0 transition-all duration-500 cursor-pointer"
                style={{ filter: "grayscale(100%)", transition: "filter 0.5s", maxHeight: '3rem' }}
                onMouseEnter={e => (e.currentTarget.style.filter = "none")}
                onMouseLeave={e => (e.currentTarget.style.filter = "grayscale(100%)")}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
