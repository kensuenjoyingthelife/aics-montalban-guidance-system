import React from 'react';

export const WavyBackground: React.FC = () => {
  return (
    <div className="waves" aria-hidden="true">
      {/* Wave Layer A - Deep Sky Azure */}
      <svg
        className="wave wave-a"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="rgba(78, 146, 223, 0.36)"
          d="M0,192 C240,112 480,272 720,192 C960,112 1200,272 1440,192 L1440,320 L0,320 Z"
        />
      </svg>

      {/* Wave Layer B - Luminous Periwinkle Azure */}
      <svg
        className="wave wave-b"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="rgba(124, 184, 247, 0.28)"
          d="M0,224 C240,288 480,144 720,224 C960,304 1200,144 1440,224 L1440,320 L0,320 Z"
        />
      </svg>

      {/* Wave Layer C - Soft Crest Silver-Ice */}
      <svg
        className="wave wave-c"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="rgba(207, 217, 242, 0.22)"
          d="M0,256 C240,192 480,296 720,256 C960,216 1200,296 1440,256 L1440,320 L0,320 Z"
        />
      </svg>
    </div>
  );
};
