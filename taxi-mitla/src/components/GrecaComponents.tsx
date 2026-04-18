/**
 * Componentes SVG con patrones de grecas zapotecas de Mitla
 * Inspirados en los mosaicos de la zona arqueológica
 */

export const GrecaPattern = ({ className = '', opacity = 0.08 }: { className?: string; opacity?: number }) => (
  <svg
    className={className}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    style={{ opacity }}
  >
    {/* Patrón de greca Step-Fret / Greca escalonada */}
    <g fill="currentColor">
      {/* Cuadrado principal */}
      <rect x="10" y="10" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="2" />
      {/* Línea horizontal central */}
      <rect x="10" y="40" width="80" height="20" />
      {/* Líneas verticales */}
      <rect x="25" y="10" width="10" height="80" />
      <rect x="40" y="10" width="10" height="80" />
      <rect x="55" y="10" width="10" height="80" />
      <rect x="70" y="10" width="10" height="80" />
    </g>
  </svg>
);

export const GrecaBorder = ({ className = '' }: { className?: string }) => (
  <div className={className}>
    <svg
      viewBox="0 0 400 20"
      className="w-full h-4"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <pattern id="greca-border" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
        <path
          d="M0 10 L10 0 L20 10 L30 0 L40 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-amber-600"
        />
        <path
          d="M0 10 L10 20 L20 10 L30 20 L40 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-amber-600"
        />
      </pattern>
      <rect width="100%" height="100%" fill="url(#greca-border)" />
    </svg>
  </div>
);

export const GrecaDivider = ({ className = '' }: { className?: string }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-600/50 to-transparent"></div>
    <div className="px-4 flex items-center space-x-2">
      <span className="w-2 h-2 bg-amber-600 rotate-45"></span>
      <span className="w-2 h-2 bg-amber-600 rotate-45"></span>
      <span className="w-2 h-2 bg-amber-600 rotate-45"></span>
    </div>
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-600/50 to-transparent"></div>
  </div>
);

export const GrecaCorner = ({ position = 'top-left', className = '' }: { position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; className?: string }) => {
  const rotations = {
    'top-left': 0,
    'top-right': 90,
    'bottom-right': 180,
    'bottom-left': 270,
  };

  return (
    <svg
      className={className}
      viewBox="0 0 60 60"
      style={{ transform: `rotate(${rotations[position]}deg)` }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="currentColor" className="text-amber-600">
        <rect x="0" y="0" width="30" height="5" />
        <rect x="0" y="10" width="20" height="5" />
        <rect x="0" y="20" width="10" height="5" />
        <rect x="0" y="0" width="5" height="30" />
        <rect x="10" y="0" width="5" height="20" />
        <rect x="20" y="0" width="5" height="10" />
      </g>
    </svg>
  );
};

// Moto de Mitla estilizada (con toldo característico)
export const MotoIcon = ({ className = '', size = 32 }: { className?: string; size?: number }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    width={size}
    height={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Toldo característico */}
    <path
      d="M15 20 Q32 10 49 20 L49 25 Q32 15 15 25 Z"
      fill="#F59E0B"
      stroke="#D97706"
      strokeWidth="1"
    />
    {/* Cuerpo de la moto */}
    <ellipse cx="32" cy="38" rx="20" ry="8" fill="#374151" />
    {/* Rueda trasera */}
    <circle cx="18" cy="48" r="8" fill="none" stroke="#1F2937" strokeWidth="3" />
    {/* Rueda delantera */}
    <circle cx="46" cy="48" r="8" fill="none" stroke="#1F2937" strokeWidth="3" />
    {/* Asiento */}
    <path d="M20 35 Q32 30 44 35 L44 38 Q32 33 20 38 Z" fill="#1F2937" />
    {/* Manubrio */}
    <path d="M44 32 L50 28 L54 30" fill="none" stroke="#1F2937" strokeWidth="2" />
  </svg>
);

// Badge icons inspirados en cosmogonía zapoteca
export const BadgeIcon = ({ badge, size = 24 }: { badge: string; size?: number }) => {
  const badges: Record<string, { emoji: string; bg: string }> = {
    principe: { emoji: '🌱', bg: 'bg-slate-500' },        // Semilla/barro
    regular: { emoji: '🌿', bg: 'bg-green-600' },         // Maguey
    experto: { emoji: '🐆', bg: 'bg-amber-600' },         // Jaguar
    elite: { emoji: '👑', bg: 'bg-red-600' },             // Penacho/Greca dorada
  };

  const config = badges[badge] || badges.principe;

  return (
    <span
      className={`inline-flex items-center justify-center w-${Math.floor(size / 8)} h-${Math.floor(size / 8)} rounded-full ${config.bg} text-white`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {config.emoji}
    </span>
  );
};

// Logo de TaxiMitla con greca
export const LogoTaxiMitla = ({ className = '' }: { className?: string }) => (
  <div className={`relative ${className}`}>
    <svg viewBox="0 0 120 120" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Fondo circular */}
      <circle cx="60" cy="60" r="55" fill="#1F2937" />
      <circle cx="60" cy="60" r="50" fill="#111827" />

      {/* Greca decorativa */}
      <g stroke="#F59E0B" strokeWidth="2" fill="none" opacity="0.6">
        <path d="M20 30 L30 20 L40 30 L50 20 L60 30 L70 20 L80 30 L90 20 L100 30" />
        <path d="M20 90 L30 100 L40 90 L50 100 L60 90 L70 100 L80 90 L90 100 L100 90" />
        <path d="M30 20 L20 30 L20 40" />
        <path d="M90 20 L100 30 L100 40" />
        <path d="M30 100 L20 90 L20 80" />
        <path d="M90 100 L100 90 L100 80" />
      </g>

      {/* Taxi simplificado */}
      <g transform="translate(30, 45)">
        <rect x="10" y="15" width="40" height="18" rx="4" fill="#F59E0B" />
        <rect x="5" y="10" width="50" height="12" rx="3" fill="#FBBF24" />
        <circle cx="15" cy="35" r="6" fill="#374151" />
        <circle cx="45" cy="35" r="6" fill="#374151" />
        {/* Ventanas */}
        <rect x="8" y="12" width="12" height="8" rx="1" fill="#1F2937" />
        <rect x="22" y="12" width="12" height="8" rx="1" fill="#1F2937" />
        <rect x="36" y="12" width="12" height="8" rx="1" fill="#1F2937" />
      </g>

      {/* Texto MITLA */}
      <text x="60" y="88" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="bold" fontFamily="serif">
        MITLA
      </text>
    </svg>
  </div>
);

export default {
  GrecaPattern,
  GrecaBorder,
  GrecaDivider,
  GrecaCorner,
  MotoIcon,
  BadgeIcon,
  LogoTaxiMitla,
};