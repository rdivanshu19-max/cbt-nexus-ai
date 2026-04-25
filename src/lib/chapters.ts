// Curated JEE/NEET chapter lists by subject + class. Used for autocomplete + validation.
export type ChapterEntry = { name: string; classLevel: '11' | '12'; exams: ('JEE' | 'NEET')[] };

export const CHAPTERS: Record<string, ChapterEntry[]> = {
  Physics: [
    // Class 11
    { name: 'Units and Measurements', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Motion in a Straight Line', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Motion in a Plane', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Laws of Motion', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Work, Energy and Power', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'System of Particles and Rotational Motion', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Gravitation', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Mechanical Properties of Solids', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Mechanical Properties of Fluids', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Thermal Properties of Matter', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Thermodynamics', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Kinetic Theory of Gases', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Oscillations', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Waves', classLevel: '11', exams: ['JEE', 'NEET'] },
    // Class 12
    { name: 'Electric Charges and Fields', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Electrostatic Potential and Capacitance', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Current Electricity', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Moving Charges and Magnetism', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Magnetism and Matter', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Electromagnetic Induction', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Alternating Current', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Electromagnetic Waves', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Ray Optics and Optical Instruments', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Wave Optics', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Dual Nature of Radiation and Matter', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Atoms', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Nuclei', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Semiconductor Electronics', classLevel: '12', exams: ['JEE', 'NEET'] },
  ],
  Chemistry: [
    // Class 11
    { name: 'Some Basic Concepts of Chemistry', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Structure of Atom', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Classification of Elements and Periodicity', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Chemical Bonding and Molecular Structure', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'States of Matter', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Thermodynamics (Chemistry)', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Equilibrium', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Redox Reactions', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Hydrogen', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'The s-Block Elements', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'The p-Block Elements (Group 13 & 14)', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Organic Chemistry — Basic Principles & Techniques', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Hydrocarbons', classLevel: '11', exams: ['JEE', 'NEET'] },
    { name: 'Environmental Chemistry', classLevel: '11', exams: ['NEET'] },
    // Class 12
    { name: 'Solid State', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Solutions', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Electrochemistry', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Chemical Kinetics', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Surface Chemistry', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'General Principles of Isolation of Elements', classLevel: '12', exams: ['NEET'] },
    { name: 'The p-Block Elements (Group 15-18)', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'The d- and f-Block Elements', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Coordination Compounds', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Haloalkanes and Haloarenes', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Alcohols, Phenols and Ethers', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Aldehydes, Ketones and Carboxylic Acids', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Amines', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Biomolecules', classLevel: '12', exams: ['JEE', 'NEET'] },
    { name: 'Polymers', classLevel: '12', exams: ['NEET'] },
    { name: 'Chemistry in Everyday Life', classLevel: '12', exams: ['NEET'] },
  ],
  Mathematics: [
    // Class 11
    { name: 'Sets', classLevel: '11', exams: ['JEE'] },
    { name: 'Relations and Functions', classLevel: '11', exams: ['JEE'] },
    { name: 'Trigonometric Functions', classLevel: '11', exams: ['JEE'] },
    { name: 'Complex Numbers and Quadratic Equations', classLevel: '11', exams: ['JEE'] },
    { name: 'Linear Inequalities', classLevel: '11', exams: ['JEE'] },
    { name: 'Permutations and Combinations', classLevel: '11', exams: ['JEE'] },
    { name: 'Binomial Theorem', classLevel: '11', exams: ['JEE'] },
    { name: 'Sequences and Series', classLevel: '11', exams: ['JEE'] },
    { name: 'Straight Lines', classLevel: '11', exams: ['JEE'] },
    { name: 'Conic Sections', classLevel: '11', exams: ['JEE'] },
    { name: 'Three Dimensional Geometry (Intro)', classLevel: '11', exams: ['JEE'] },
    { name: 'Limits and Derivatives', classLevel: '11', exams: ['JEE'] },
    { name: 'Mathematical Reasoning', classLevel: '11', exams: ['JEE'] },
    { name: 'Statistics', classLevel: '11', exams: ['JEE'] },
    { name: 'Probability', classLevel: '11', exams: ['JEE'] },
    // Class 12
    { name: 'Relations and Functions (Advanced)', classLevel: '12', exams: ['JEE'] },
    { name: 'Inverse Trigonometric Functions', classLevel: '12', exams: ['JEE'] },
    { name: 'Matrices', classLevel: '12', exams: ['JEE'] },
    { name: 'Determinants', classLevel: '12', exams: ['JEE'] },
    { name: 'Continuity and Differentiability', classLevel: '12', exams: ['JEE'] },
    { name: 'Application of Derivatives', classLevel: '12', exams: ['JEE'] },
    { name: 'Integrals', classLevel: '12', exams: ['JEE'] },
    { name: 'Application of Integrals', classLevel: '12', exams: ['JEE'] },
    { name: 'Differential Equations', classLevel: '12', exams: ['JEE'] },
    { name: 'Vector Algebra', classLevel: '12', exams: ['JEE'] },
    { name: 'Three Dimensional Geometry', classLevel: '12', exams: ['JEE'] },
    { name: 'Linear Programming', classLevel: '12', exams: ['JEE'] },
    { name: 'Probability (Advanced)', classLevel: '12', exams: ['JEE'] },
  ],
  Biology: [
    // Class 11
    { name: 'The Living World', classLevel: '11', exams: ['NEET'] },
    { name: 'Biological Classification', classLevel: '11', exams: ['NEET'] },
    { name: 'Plant Kingdom', classLevel: '11', exams: ['NEET'] },
    { name: 'Animal Kingdom', classLevel: '11', exams: ['NEET'] },
    { name: 'Morphology of Flowering Plants', classLevel: '11', exams: ['NEET'] },
    { name: 'Anatomy of Flowering Plants', classLevel: '11', exams: ['NEET'] },
    { name: 'Structural Organisation in Animals', classLevel: '11', exams: ['NEET'] },
    { name: 'Cell — The Unit of Life', classLevel: '11', exams: ['NEET'] },
    { name: 'Biomolecules (Biology)', classLevel: '11', exams: ['NEET'] },
    { name: 'Cell Cycle and Cell Division', classLevel: '11', exams: ['NEET'] },
    { name: 'Photosynthesis in Higher Plants', classLevel: '11', exams: ['NEET'] },
    { name: 'Respiration in Plants', classLevel: '11', exams: ['NEET'] },
    { name: 'Plant Growth and Development', classLevel: '11', exams: ['NEET'] },
    { name: 'Breathing and Exchange of Gases', classLevel: '11', exams: ['NEET'] },
    { name: 'Body Fluids and Circulation', classLevel: '11', exams: ['NEET'] },
    { name: 'Excretory Products and Their Elimination', classLevel: '11', exams: ['NEET'] },
    { name: 'Locomotion and Movement', classLevel: '11', exams: ['NEET'] },
    { name: 'Neural Control and Coordination', classLevel: '11', exams: ['NEET'] },
    { name: 'Chemical Coordination and Integration', classLevel: '11', exams: ['NEET'] },
    // Class 12
    { name: 'Sexual Reproduction in Flowering Plants', classLevel: '12', exams: ['NEET'] },
    { name: 'Human Reproduction', classLevel: '12', exams: ['NEET'] },
    { name: 'Reproductive Health', classLevel: '12', exams: ['NEET'] },
    { name: 'Principles of Inheritance and Variation', classLevel: '12', exams: ['NEET'] },
    { name: 'Molecular Basis of Inheritance', classLevel: '12', exams: ['NEET'] },
    { name: 'Evolution', classLevel: '12', exams: ['NEET'] },
    { name: 'Human Health and Disease', classLevel: '12', exams: ['NEET'] },
    { name: 'Microbes in Human Welfare', classLevel: '12', exams: ['NEET'] },
    { name: 'Biotechnology — Principles and Processes', classLevel: '12', exams: ['NEET'] },
    { name: 'Biotechnology and Its Applications', classLevel: '12', exams: ['NEET'] },
    { name: 'Organisms and Populations', classLevel: '12', exams: ['NEET'] },
    { name: 'Ecosystem', classLevel: '12', exams: ['NEET'] },
    { name: 'Biodiversity and Conservation', classLevel: '12', exams: ['NEET'] },
  ],
};

export function getChapters(subject: string, exam: string, classLevel: string): string[] {
  const list = CHAPTERS[subject] || [];
  return list
    .filter((c) => {
      const examOk = exam === 'Both' ? true : c.exams.includes(exam as any);
      const classOk = classLevel === 'Dropper' ? true : c.classLevel === classLevel;
      return examOk && classOk;
    })
    .map((c) => c.name);
}

export function isValidChapter(subject: string, chapter: string): boolean {
  const list = CHAPTERS[subject] || [];
  const norm = chapter.trim().toLowerCase();
  return list.some((c) => c.name.toLowerCase() === norm);
}
