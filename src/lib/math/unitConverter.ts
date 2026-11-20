import Decimal from 'decimal.js';

export type UnitCategoryId =
  | 'length'
  | 'weight'
  | 'temperature'
  | 'area'
  | 'volume'
  | 'speed'
  | 'time'
  | 'data'
  | 'energy'
  | 'pressure'
  | 'power'
  | 'frequency';

export interface UnitDefinition {
  id: string;
  name: string;
  symbol: string;
  factorToBase?: number; // linear factor relative to category base unit
}

export interface UnitCategory {
  id: UnitCategoryId;
  label: string;
  baseUnit: string;
  units: UnitDefinition[];
}

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    label: 'Length',
    baseUnit: 'm',
    units: [
      { id: 'mm', name: 'Millimeter', symbol: 'mm', factorToBase: 0.001 },
      { id: 'cm', name: 'Centimeter', symbol: 'cm', factorToBase: 0.01 },
      { id: 'm', name: 'Meter', symbol: 'm', factorToBase: 1 },
      { id: 'km', name: 'Kilometer', symbol: 'km', factorToBase: 1000 },
      { id: 'in', name: 'Inch', symbol: 'in', factorToBase: 0.0254 },
      { id: 'ft', name: 'Foot', symbol: 'ft', factorToBase: 0.3048 },
      { id: 'yd', name: 'Yard', symbol: 'yd', factorToBase: 0.9144 },
      { id: 'mi', name: 'Mile', symbol: 'mi', factorToBase: 1609.344 },
    ],
  },
  {
    id: 'weight',
    label: 'Weight & Mass',
    baseUnit: 'kg',
    units: [
      { id: 'mg', name: 'Milligram', symbol: 'mg', factorToBase: 1e-6 },
      { id: 'g', name: 'Gram', symbol: 'g', factorToBase: 0.001 },
      { id: 'kg', name: 'Kilogram', symbol: 'kg', factorToBase: 1 },
      { id: 't', name: 'Metric Tonne', symbol: 't', factorToBase: 1000 },
      { id: 'lb', name: 'Pound', symbol: 'lb', factorToBase: 0.45359237 },
      { id: 'oz', name: 'Ounce', symbol: 'oz', factorToBase: 0.028349523125 },
    ],
  },
  {
    id: 'temperature',
    label: 'Temperature',
    baseUnit: 'C',
    units: [
      { id: 'C', name: 'Celsius', symbol: '°C' },
      { id: 'F', name: 'Fahrenheit', symbol: '°F' },
      { id: 'K', name: 'Kelvin', symbol: 'K' },
    ],
  },
  {
    id: 'area',
    label: 'Area',
    baseUnit: 'm2',
    units: [
      { id: 'mm2', name: 'Square Millimeter', symbol: 'mm²', factorToBase: 1e-6 },
      { id: 'cm2', name: 'Square Centimeter', symbol: 'cm²', factorToBase: 1e-4 },
      { id: 'm2', name: 'Square Meter', symbol: 'm²', factorToBase: 1 },
      { id: 'ha', name: 'Hectare', symbol: 'ha', factorToBase: 10000 },
      { id: 'km2', name: 'Square Kilometer', symbol: 'km²', factorToBase: 1e6 },
      { id: 'ft2', name: 'Square Foot', symbol: 'ft²', factorToBase: 0.09290304 },
      { id: 'ac', name: 'Acre', symbol: 'ac', factorToBase: 4046.8564224 },
    ],
  },
  {
    id: 'volume',
    label: 'Volume',
    baseUnit: 'L',
    units: [
      { id: 'mL', name: 'Milliliter', symbol: 'mL', factorToBase: 0.001 },
      { id: 'L', name: 'Liter', symbol: 'L', factorToBase: 1 },
      { id: 'm3', name: 'Cubic Meter', symbol: 'm³', factorToBase: 1000 },
      { id: 'tsp', name: 'Teaspoon (US)', symbol: 'tsp', factorToBase: 0.00492892159375 },
      { id: 'cup', name: 'Cup (US)', symbol: 'cup', factorToBase: 0.2365882365 },
      { id: 'gal', name: 'Gallon (US)', symbol: 'gal', factorToBase: 3.785411784 },
    ],
  },
  {
    id: 'speed',
    label: 'Speed',
    baseUnit: 'mps',
    units: [
      { id: 'mps', name: 'Meters / second', symbol: 'm/s', factorToBase: 1 },
      { id: 'kmh', name: 'Kilometers / hour', symbol: 'km/h', factorToBase: 1 / 3.6 },
      { id: 'mph', name: 'Miles / hour', symbol: 'mph', factorToBase: 0.44704 },
      { id: 'kn', name: 'Knots', symbol: 'kn', factorToBase: 0.5144444444 },
      { id: 'mach', name: 'Mach (Sea Level)', symbol: 'Mach', factorToBase: 340.29 },
    ],
  },
  {
    id: 'time',
    label: 'Time',
    baseUnit: 's',
    units: [
      { id: 'ms', name: 'Millisecond', symbol: 'ms', factorToBase: 0.001 },
      { id: 's', name: 'Second', symbol: 's', factorToBase: 1 },
      { id: 'min', name: 'Minute', symbol: 'min', factorToBase: 60 },
      { id: 'h', name: 'Hour', symbol: 'hr', factorToBase: 3600 },
      { id: 'd', name: 'Day', symbol: 'd', factorToBase: 86400 },
      { id: 'wk', name: 'Week', symbol: 'wk', factorToBase: 604800 },
      { id: 'yr', name: 'Year (365d)', symbol: 'yr', factorToBase: 31536000 },
    ],
  },
  {
    id: 'data',
    label: 'Data Storage',
    baseUnit: 'B',
    units: [
      { id: 'bit', name: 'Bit', symbol: 'b', factorToBase: 0.125 },
      { id: 'B', name: 'Byte', symbol: 'B', factorToBase: 1 },
      { id: 'KB', name: 'Kilobyte (10³)', symbol: 'KB', factorToBase: 1000 },
      { id: 'KiB', name: 'Kibibyte (2¹⁰)', symbol: 'KiB', factorToBase: 1024 },
      { id: 'MB', name: 'Megabyte (10⁶)', symbol: 'MB', factorToBase: 1e6 },
      { id: 'MiB', name: 'Mebibyte (2²⁰)', symbol: 'MiB', factorToBase: 1048576 },
      { id: 'GB', name: 'Gigabyte (10⁹)', symbol: 'GB', factorToBase: 1e9 },
      { id: 'GiB', name: 'Gibibyte (2³⁰)', symbol: 'GiB', factorToBase: 1073741824 },
      { id: 'TB', name: 'Terabyte (10¹²)', symbol: 'TB', factorToBase: 1e12 },
    ],
  },
  {
    id: 'energy',
    label: 'Energy',
    baseUnit: 'J',
    units: [
      { id: 'J', name: 'Joule', symbol: 'J', factorToBase: 1 },
      { id: 'kJ', name: 'Kilojoule', symbol: 'kJ', factorToBase: 1000 },
      { id: 'cal', name: 'Calorie (th)', symbol: 'cal', factorToBase: 4.184 },
      { id: 'kcal', name: 'Kilocalorie', symbol: 'kcal', factorToBase: 4184 },
      { id: 'Wh', name: 'Watt-hour', symbol: 'Wh', factorToBase: 3600 },
      { id: 'kWh', name: 'Kilowatt-hour', symbol: 'kWh', factorToBase: 3.6e6 },
      { id: 'eV', name: 'Electronvolt', symbol: 'eV', factorToBase: 1.602176634e-19 },
    ],
  },
  {
    id: 'pressure',
    label: 'Pressure',
    baseUnit: 'Pa',
    units: [
      { id: 'Pa', name: 'Pascal', symbol: 'Pa', factorToBase: 1 },
      { id: 'kPa', name: 'Kilopascal', symbol: 'kPa', factorToBase: 1000 },
      { id: 'bar', name: 'Bar', symbol: 'bar', factorToBase: 100000 },
      { id: 'atm', name: 'Atmosphere', symbol: 'atm', factorToBase: 101325 },
      { id: 'psi', name: 'Pounds / sq in', symbol: 'psi', factorToBase: 6894.757293168 },
      { id: 'mmHg', name: 'Torr / mmHg', symbol: 'mmHg', factorToBase: 133.322387415 },
    ],
  },
  {
    id: 'power',
    label: 'Power',
    baseUnit: 'W',
    units: [
      { id: 'W', name: 'Watt', symbol: 'W', factorToBase: 1 },
      { id: 'kW', name: 'Kilowatt', symbol: 'kW', factorToBase: 1000 },
      { id: 'MW', name: 'Megawatt', symbol: 'MW', factorToBase: 1e6 },
      { id: 'hp', name: 'Horsepower (mech)', symbol: 'hp', factorToBase: 745.69987158 },
      { id: 'BTUh', name: 'BTU / hour', symbol: 'BTU/h', factorToBase: 0.29307107 },
    ],
  },
  {
    id: 'frequency',
    label: 'Frequency',
    baseUnit: 'Hz',
    units: [
      { id: 'Hz', name: 'Hertz', symbol: 'Hz', factorToBase: 1 },
      { id: 'kHz', name: 'Kilohertz', symbol: 'kHz', factorToBase: 1e3 },
      { id: 'MHz', name: 'Megahertz', symbol: 'MHz', factorToBase: 1e6 },
      { id: 'GHz', name: 'Gigahertz', symbol: 'GHz', factorToBase: 1e9 },
      { id: 'rpm', name: 'Rev / minute', symbol: 'rpm', factorToBase: 1 / 60 },
    ],
  },
];

export function convertUnit(
  value: number,
  fromUnitId: string,
  toUnitId: string,
  categoryId: UnitCategoryId
): number {
  if (!Number.isFinite(value)) return NaN;
  const category = UNIT_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) throw new Error(`Unknown unit category: ${categoryId}`);

  if (fromUnitId === toUnitId) return value;

  if (categoryId === 'temperature') {
    const valD = new Decimal(value);
    let celsius: Decimal;
    if (fromUnitId === 'C') celsius = valD;
    else if (fromUnitId === 'F') celsius = valD.minus(32).times(5).div(9);
    else if (fromUnitId === 'K') celsius = valD.minus(273.15);
    else throw new Error(`Unknown temperature unit: ${fromUnitId}`);

    if (toUnitId === 'C') return celsius.toNumber();
    if (toUnitId === 'F') return celsius.times(9).div(5).plus(32).toNumber();
    if (toUnitId === 'K') return celsius.plus(273.15).toNumber();
    throw new Error(`Unknown temperature unit: ${toUnitId}`);
  }

  const fromUnit = category.units.find((u) => u.id === fromUnitId);
  const toUnit = category.units.find((u) => u.id === toUnitId);
  if (!fromUnit?.factorToBase || !toUnit?.factorToBase) {
    throw new Error(`Invalid units ${fromUnitId} -> ${toUnitId}`);
  }

  const baseVal = new Decimal(value).times(fromUnit.factorToBase);
  return baseVal.div(toUnit.factorToBase).toNumber();
}
