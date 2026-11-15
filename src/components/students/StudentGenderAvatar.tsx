import React from 'react';

/**
 * Predict gender based on standard Philippine first names
 */
export function detectGenderFromName(fullName: string): 'boy' | 'girl' {
  if (!fullName) return 'boy';

  // Extract first name (ignore middle initials/names and surname)
  // Usually Philippine full names in masterlists are "FirstName [MiddleName] Surname"
  // or "Surname, FirstName [MiddleName]"
  let cleaned = fullName.trim();
  if (cleaned.includes(',')) {
    // "Santos, Abigail J." -> take part after comma
    const afterComma = cleaned.split(',')[1] || '';
    cleaned = afterComma.trim();
  }

  const firstTokens = cleaned.toLowerCase().split(/\s+/);
  const firstName = firstTokens[0] || '';
  const secondName = firstTokens[1] || '';

  const femaleNames = new Set([
    'abigail', 'abigayle', 'alexa', 'alexandra', 'alexis', 'alice', 'alicia', 'althea', 'alyssa', 'amanda', 'amy',
    'ana', 'angela', 'angelica', 'angelina', 'angeline', 'ann', 'anna', 'anne', 'annette', 'april', 'ariana', 'arianna',
    'ashley', 'bea', 'beatrice', 'beatriz', 'bernadette', 'bianca', 'camille', 'candice', 'carla', 'carmela', 'carol',
    'carolina', 'catherine', 'cathleen', 'catriona', 'cecilia', 'celeste', 'celine', 'charisse', 'charlene', 'chelsea',
    'cherry', 'cheryl', 'chloe', 'christina', 'christine', 'cindy', 'claire', 'clara', 'clarisse', 'claudia', 'claudine',
    'criselda', 'cristina', 'crystal', 'cynthia', 'daisy', 'danica', 'daniela', 'danielle', 'darlene', 'denise', 'diana',
    'diane', 'donna', 'editha', 'elaine', 'eleanor', 'elena', 'elisa', 'elizabeth', 'ella', 'ellen', 'ellie', 'elsa',
    'emily', 'emma', 'erica', 'erika', 'estella', 'esther', 'eva', 'evelyn', 'faith', 'fatima', 'faye', 'felicity',
    'fiona', 'florence', 'frances', 'francesca', 'francine', 'gabriella', 'gabrielle', 'gem', 'gemma', 'genevieve',
    'georgia', 'gina', 'giselle', 'glenda', 'gloria', 'grace', 'gretchen', 'hannah', 'hazel', 'helen', 'hillary',
    'hope', 'ines', 'irene', 'iris', 'isabel', 'isabela', 'isabella', 'isabelle', 'ivana', 'ivy', 'jacqueline', 'jade',
    'jamie', 'jane', 'janet', 'janice', 'janine', 'jasmin', 'jasmine', 'jean', 'jeanne', 'jen', 'jenna', 'jennifer',
    'jenny', 'jessica', 'jill', 'jillian', 'joan', 'joana', 'joanna', 'jocelyn', 'joy', 'joyce', 'judith', 'judy',
    'julia', 'juliana', 'julianne', 'julie', 'justine', 'karen', 'karina', 'karla', 'kate', 'katelyn', 'kathleen',
    'kathryn', 'katrina', 'kaye', 'kayla', 'keanna', 'kelly', 'kim', 'kimberly', 'kirsten', 'kristel', 'kristen',
    'kristine', 'kylie', 'lara', 'laura', 'lauren', 'lea', 'leah', 'leslie', 'liana', 'liezel', 'lilian', 'lily',
    'linda', 'lisa', 'lorraine', 'louisa', 'louise', 'lucia', 'lucille', 'luna', 'lyka', 'lyn', 'lynn', 'madel',
    'madeline', 'mae', 'magdalena', 'maia', 'maica', 'mandy', 'mara', 'marcelina', 'margaret', 'margarita', 'maria',
    'marian', 'mariana', 'marianne', 'marie', 'marina', 'marisa', 'marissa', 'marivic', 'marjorie', 'marlene', 'mary',
    'maryann', 'may', 'maya', 'melanie', 'melinda', 'melissa', 'mercedes', 'mercy', 'mia', 'michelle', 'mikaela',
    'mila', 'miriam', 'mona', 'monica', 'monique', 'nadine', 'naomi', 'natalia', 'natalie', 'natasha', 'nerissa',
    'nicole', 'nina', 'noelle', 'nora', 'olivia', 'pamela', 'patricia', 'paula', 'pauline', 'pearl', 'penelope',
    'phoebe', 'priscilla', 'queen', 'queenie', 'rachel', 'raquel', 'rebecca', 'regina', 'renee', 'rhoda', 'ria',
    'richelle', 'rita', 'rochelle', 'rosa', 'rosalie', 'rosalinda', 'rose', 'rosemarie', 'roselyn', 'rowena', 'roxanne',
    'ruby', 'ruth', 'sabrina', 'salome', 'samantha', 'samara', 'sandra', 'sara', 'sarah', 'scarlet', 'scarlett',
    'selena', 'serena', 'shaina', 'shaira', 'sharon', 'sheena', 'sheila', 'sheryl', 'sienna', 'sofia', 'sophia',
    'sophie', 'stacy', 'stella', 'stephanie', 'susan', 'suzanne', 'tanya', 'tara', 'theresa', 'therese', 'trisha',
    'valerie', 'vanessa', 'veronica', 'victoria', 'vina', 'violet', 'vivian', 'wendy', 'whitney', 'yasmin', 'yasmine',
    'yvonne', 'zoe', 'edz', 'lotlot'
  ]);

  if (femaleNames.has(firstName) || femaleNames.has(secondName)) {
    return 'girl';
  }

  // Common feminine suffixes/names in the Philippines
  if (firstName.endsWith('a') && !['joshua', 'luca', 'elisha', 'ezra', 'bonifacio'].includes(firstName)) {
    return 'girl';
  }
  if (firstName.endsWith('lyn') || firstName.endsWith('line') || firstName.endsWith('belle') || firstName.endsWith('rose') || firstName.endsWith('ann')) {
    return 'girl';
  }

  return 'boy';
}

/**
 * High-craft, handsome AICS Boy SVG avatar wearing the white uniform & blue lanyard
 */
export const AicsBoySvg: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="AICS Boy Student Avatar"
  >
    {/* Soft subtle studio background circle */}
    <circle cx="50" cy="50" r="48" fill="#E8EEF8" stroke="#CBD5E1" strokeWidth="2" />
    
    {/* Shoulders & White Uniform Shirt */}
    <path
      d="M20 96 C22 76, 34 68, 50 68 C66 68, 78 76, 80 96 Z"
      fill="#FFFFFF"
      stroke="#94A3B8"
      strokeWidth="1.5"
    />
    
    {/* Blue Collar / Lapels */}
    <path d="M42 68 L50 78 L34 76 Z" fill="#F8FAFC" stroke="#64748B" strokeWidth="1" />
    <path d="M58 68 L50 78 L66 76 Z" fill="#F8FAFC" stroke="#64748B" strokeWidth="1" />
    <path d="M50 78 L50 96" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="2 2" />

    {/* Official AICS Royal Blue Lanyard */}
    <path d="M44 68 L48 96" stroke="#1E469B" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M56 68 L52 96" stroke="#1E469B" strokeWidth="2.5" strokeLinecap="round" />
    
    {/* Neck */}
    <path d="M43 56 C43 64, 57 64, 57 56 Z" fill="#FADBC8" />

    {/* Ears */}
    <circle cx="34" cy="46" r="4" fill="#FADBC8" />
    <circle cx="66" cy="46" r="4" fill="#FADBC8" />

    {/* Handsome Face Jawline */}
    <path
      d="M36 41 C36 57, 43 62, 50 62 C57 62, 64 57, 64 41 Z"
      fill="#FCE7D8"
      stroke="#E2A685"
      strokeWidth="0.8"
    />

    {/* Eyes - Sharp, confident & clean */}
    <ellipse cx="44" cy="45" rx="2.4" ry="2.8" fill="#1E293B" />
    <circle cx="45" cy="44" r="0.8" fill="#FFFFFF" />
    <ellipse cx="56" cy="45" rx="2.4" ry="2.8" fill="#1E293B" />
    <circle cx="57" cy="44" r="0.8" fill="#FFFFFF" />

    {/* Neat groomed eyebrows */}
    <path d="M41 40 Q44 38 48 40" stroke="#1E1E24" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M59 40 Q56 38 52 40" stroke="#1E1E24" strokeWidth="1.5" strokeLinecap="round" />

    {/* Subtle nose & gentle smile */}
    <path d="M50 46 L49 49 L51 49" stroke="#E2A685" strokeWidth="1" strokeLinecap="round" />
    <path d="M47 54 Q50 57 53 54" stroke="#BE123C" strokeWidth="1.2" strokeLinecap="round" fill="none" />

    {/* Stylish Handsome Modern Side-Part Hair */}
    <path
      d="M33 42 C32 30, 42 22, 50 22 C60 22, 68 30, 67 42 C67 36, 64 28, 54 28 C46 28, 40 32, 36 40 Z"
      fill="#18181B"
    />
    <path
      d="M34 40 C36 29, 44 24, 52 24 C62 24, 66 31, 66 40 C63 32, 57 28, 51 28 C43 28, 38 33, 34 40 Z"
      fill="#27272A"
    />
  </svg>
);

/**
 * High-craft, beautiful AICS Girl SVG avatar with neat, pretty short-hair bob & blue lanyard
 */
export const AicsGirlSvg: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="AICS Girl Student Avatar"
  >
    {/* Soft subtle studio background circle */}
    <circle cx="50" cy="50" r="48" fill="#FDF2F8" stroke="#CBD5E1" strokeWidth="2" />

    {/* Shoulders & Grey / White Senior High Uniform Blouse */}
    <path
      d="M20 96 C22 76, 34 68, 50 68 C66 68, 78 76, 80 96 Z"
      fill="#F1F5F9"
      stroke="#94A3B8"
      strokeWidth="1.5"
    />

    {/* Elegant Blue Sailor-style Lapels / Tie */}
    <path d="M42 68 L50 79 L35 75 Z" fill="#DBEAFE" stroke="#2563EB" strokeWidth="1" />
    <path d="M58 68 L50 79 L65 75 Z" fill="#DBEAFE" stroke="#2563EB" strokeWidth="1" />
    <path d="M48 76 L52 76 L51 86 L49 86 Z" fill="#1E469B" />

    {/* Official AICS Blue Lanyard */}
    <path d="M44 68 L48 96" stroke="#1E469B" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M56 68 L52 96" stroke="#1E469B" strokeWidth="2.5" strokeLinecap="round" />

    {/* Neck */}
    <path d="M43 56 C43 64, 57 64, 57 56 Z" fill="#FCE7D8" />

    {/* Ears */}
    <circle cx="34" cy="46" r="3.8" fill="#FCE7D8" />
    <circle cx="66" cy="46" r="3.8" fill="#FCE7D8" />

    {/* Pretty Petite Face Jawline */}
    <path
      d="M37 41 C37 56, 44 61, 50 61 C56 61, 63 56, 63 41 Z"
      fill="#FFF1E6"
      stroke="#F3A988"
      strokeWidth="0.8"
    />

    {/* Big expressive, pretty dark eyes */}
    <ellipse cx="44" cy="45" rx="2.5" ry="3.2" fill="#1E293B" />
    <circle cx="45" cy="43.5" r="1.1" fill="#FFFFFF" />
    <circle cx="43" cy="46" r="0.5" fill="#FFFFFF" />
    
    <ellipse cx="56" cy="45" rx="2.5" ry="3.2" fill="#1E293B" />
    <circle cx="57" cy="43.5" r="1.1" fill="#FFFFFF" />
    <circle cx="55" cy="46" r="0.5" fill="#FFFFFF" />

    {/* Delicate curved feminine eyelashes & brows */}
    <path d="M41 42 Q44 40 47 43" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    <path d="M59 42 Q56 40 53 43" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    <path d="M41 39 Q44 37 48 39" stroke="#3F3F46" strokeWidth="1.1" strokeLinecap="round" fill="none" />
    <path d="M59 39 Q56 37 52 39" stroke="#3F3F46" strokeWidth="1.1" strokeLinecap="round" fill="none" />

    {/* Cute blush on cheeks */}
    <ellipse cx="40" cy="51" rx="2.5" ry="1.2" fill="#FB7185" opacity="0.45" />
    <ellipse cx="60" cy="51" rx="2.5" ry="1.2" fill="#FB7185" opacity="0.45" />

    {/* Dainty nose & rosy cheerful smile */}
    <path d="M50 47 L49.5 49 L50.5 49" stroke="#F3A988" strokeWidth="0.9" strokeLinecap="round" />
    <path d="M47 53.5 Q50 56.5 53 53.5" stroke="#E11D48" strokeWidth="1.4" strokeLinecap="round" fill="none" />

    {/* Very Pretty Chic Modern Short Hair Bob */}
    {/* Behind bob layers */}
    <path
      d="M32 40 C30 52, 33 60, 36 63 C35 55, 34 46, 35 40 Z"
      fill="#261A15"
    />
    <path
      d="M68 40 C70 52, 67 60, 64 63 C65 55, 66 46, 65 40 Z"
      fill="#261A15"
    />

    {/* Front sleek bangs & side framing curls */}
    <path
      d="M33 38 C33 24, 42 20, 50 20 C58 20, 67 24, 67 38 C67 47, 66 58, 63 60 C61 50, 64 42, 63 38 C60 38, 54 34, 50 34 C46 34, 40 38, 37 38 C36 42, 39 50, 37 60 C34 58, 33 47, 33 38 Z"
      fill="#38261F"
    />
    {/* Soft hair highlight curve */}
    <path
      d="M38 28 Q50 23 62 28"
      stroke="#5C3D31"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.6"
    />
  </svg>
);

/**
 * Smart Component: Automatically picks the gorgeous Boy or Girl AICS avatar based on student name!
 */
export const StudentGenderAvatar: React.FC<{
  fullName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ fullName, size = 'md', className = '' }) => {
  const gender = detectGenderFromName(fullName);

  const sizeClasses = {
    sm: 'w-8 h-8 min-w-8 min-h-8',
    md: 'w-10 h-10 min-w-10 min-h-10',
    lg: 'w-12 h-12 min-w-12 min-h-12',
    xl: 'w-16 h-16 min-w-16 min-h-16',
  }[size];

  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 shadow-xs border border-slate-200 dark:border-white/10 ${sizeClasses} ${className}`}
      title={`${fullName} (${gender === 'girl' ? 'Female' : 'Male'})`}
    >
      {gender === 'girl' ? <AicsGirlSvg /> : <AicsBoySvg />}
    </div>
  );
};
