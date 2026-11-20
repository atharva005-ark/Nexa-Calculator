export interface FormulaItem {
  id: string;
  title: string;
  category: 'Algebra' | 'Geometry' | 'Trigonometry' | 'Calculus' | 'Physics' | 'Finance';
  formula: string;
  evaluableTemplate: string;
  variables: Array<{ name: string; label: string; defaultVal: number }>;
  description: string;
}

export interface ConstantItem {
  symbol: string;
  name: string;
  value: string;
  numericValue: string;
  unit: string;
  category: 'Mathematics' | 'Physics' | 'Chemistry';
}

export const FORMULA_LIBRARY: FormulaItem[] = [
  {
    id: 'quadratic-discriminant',
    title: 'Quadratic Formula (Positive Root)',
    category: 'Algebra',
    formula: 'x = (-b + √(b² - 4ac)) / (2a)',
    evaluableTemplate: '(-b + sqrt(b^2 - 4*a*c)) / (2*a)',
    variables: [
      { name: 'a', label: 'Coefficient a', defaultVal: 1 },
      { name: 'b', label: 'Coefficient b', defaultVal: -5 },
      { name: 'c', label: 'Constant c', defaultVal: 6 },
    ],
    description: 'Computes the principal root of ax² + bx + c = 0.',
  },
  {
    id: 'pythagorean',
    title: 'Pythagorean Hypotenuse',
    category: 'Geometry',
    formula: 'c = √(a² + b²)',
    evaluableTemplate: 'sqrt(a^2 + b^2)',
    variables: [
      { name: 'a', label: 'Side a', defaultVal: 3 },
      { name: 'b', label: 'Side b', defaultVal: 4 },
    ],
    description: 'Finds the hypotenuse length of a right-angled triangle.',
  },
  {
    id: 'circle-area',
    title: 'Area of a Circle',
    category: 'Geometry',
    formula: 'A = π · r²',
    evaluableTemplate: 'pi * r^2',
    variables: [{ name: 'r', label: 'Radius r', defaultVal: 5 }],
    description: 'Area enclosed by a circle of radius r.',
  },
  {
    id: 'sphere-volume',
    title: 'Volume of a Sphere',
    category: 'Geometry',
    formula: 'V = (4/3) · π · r³',
    evaluableTemplate: '(4/3) * pi * r^3',
    variables: [{ name: 'r', label: 'Radius r', defaultVal: 3 }],
    description: 'Three-dimensional volume of a sphere.',
  },
  {
    id: 'law-of-cosines',
    title: 'Law of Cosines (Side c)',
    category: 'Trigonometry',
    formula: 'c = √(a² + b² - 2ab·cos(C))',
    evaluableTemplate: 'sqrt(a^2 + b^2 - 2*a*b*cos(C))',
    variables: [
      { name: 'a', label: 'Side a', defaultVal: 7 },
      { name: 'b', label: 'Side b', defaultVal: 9 },
      { name: 'C', label: 'Angle C (in current DEG/RAD)', defaultVal: 60 },
    ],
    description: 'Relates the lengths of the sides of a triangle to the cosine of one of its angles.',
  },
  {
    id: 'kinetic-energy',
    title: 'Kinetic Energy',
    category: 'Physics',
    formula: 'KE = ½ · m · v²',
    evaluableTemplate: '0.5 * m * v^2',
    variables: [
      { name: 'm', label: 'Mass m (kg)', defaultVal: 10 },
      { name: 'v', label: 'Velocity v (m/s)', defaultVal: 12 },
    ],
    description: 'Translational kinetic energy of a moving body in Joules.',
  },
  {
    id: 'gravitational-force',
    title: 'Newton’s Law of Gravitation',
    category: 'Physics',
    formula: 'F = G · (m₁ · m₂) / r²',
    evaluableTemplate: '6.67430e-11 * m1 * m2 / r^2',
    variables: [
      { name: 'm1', label: 'Mass 1 (kg)', defaultVal: 5.972e24 },
      { name: 'm2', label: 'Mass 2 (kg)', defaultVal: 70 },
      { name: 'r', label: 'Distance r (m)', defaultVal: 6.371e6 },
    ],
    description: 'Gravitational attraction force between two point masses.',
  },
  {
    id: 'compound-growth',
    title: 'Compound Growth Factor',
    category: 'Finance',
    formula: 'A = P · (1 + r/n)^(n·t)',
    evaluableTemplate: 'P * (1 + r/n)^(n*t)',
    variables: [
      { name: 'P', label: 'Principal P', defaultVal: 10000 },
      { name: 'r', label: 'Annual Rate (decimal, e.g. 0.08)', defaultVal: 0.08 },
      { name: 'n', label: 'Compounds/yr n', defaultVal: 12 },
      { name: 't', label: 'Years t', defaultVal: 5 },
    ],
    description: 'Future value of principal P compounded n times per year.',
  },
];

export const CONSTANTS_LIBRARY: ConstantItem[] = [
  { symbol: 'π', name: 'Archimedes’ Constant (Pi)', value: '3.141592653589793', numericValue: 'pi', unit: 'dimensionless', category: 'Mathematics' },
  { symbol: 'e', name: 'Euler’s Number', value: '2.718281828459045', numericValue: 'e', unit: 'dimensionless', category: 'Mathematics' },
  { symbol: 'φ', name: 'Golden Ratio', value: '1.618033988749895', numericValue: '1.618033988749895', unit: 'dimensionless', category: 'Mathematics' },
  { symbol: '√2', name: 'Pythagoras’ Constant', value: '1.4142135623730951', numericValue: 'sqrt(2)', unit: 'dimensionless', category: 'Mathematics' },
  { symbol: 'γ', name: 'Euler–Mascheroni Constant', value: '0.5772156649015329', numericValue: '0.5772156649015329', unit: 'dimensionless', category: 'Mathematics' },
  { symbol: 'c', name: 'Speed of Light in Vacuum', value: '299,792,458', numericValue: '299792458', unit: 'm/s', category: 'Physics' },
  { symbol: 'g', name: 'Standard Earth Gravity', value: '9.80665', numericValue: '9.80665', unit: 'm/s²', category: 'Physics' },
  { symbol: 'G', name: 'Gravitational Constant', value: '6.67430 × 10⁻¹¹', numericValue: '6.67430e-11', unit: 'm³·kg⁻¹·s⁻²', category: 'Physics' },
  { symbol: 'h', name: 'Planck Constant', value: '6.62607015 × 10⁻³⁴', numericValue: '6.62607015e-34', unit: 'J·s', category: 'Physics' },
  { symbol: 'e_q', name: 'Elementary Charge', value: '1.602176634 × 10⁻¹⁹', numericValue: '1.602176634e-19', unit: 'C', category: 'Physics' },
  { symbol: 'N_A', name: 'Avogadro Constant', value: '6.02214076 × 10²³', numericValue: '6.02214076e23', unit: 'mol⁻¹', category: 'Chemistry' },
  { symbol: 'R', name: 'Molar Gas Constant', value: '8.314462618', numericValue: '8.314462618', unit: 'J/(mol·K)', category: 'Chemistry' },
  { symbol: 'k_B', name: 'Boltzmann Constant', value: '1.380649 × 10⁻²³', numericValue: '1.380649e-23', unit: 'J/K', category: 'Chemistry' },
];
