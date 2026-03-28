const countryCurrencyMap: Record<string, { code: string; locale: string }> = {
  netherlands: { code: 'EUR', locale: 'nl-NL' },
  nederland: { code: 'EUR', locale: 'nl-NL' },
  germany: { code: 'EUR', locale: 'de-DE' },
  france: { code: 'EUR', locale: 'fr-FR' },
  belgium: { code: 'EUR', locale: 'nl-BE' },
  'united states': { code: 'USD', locale: 'en-US' },
  usa: { code: 'USD', locale: 'en-US' },
  'united kingdom': { code: 'GBP', locale: 'en-GB' },
};

function getCurrencyConfig(country: string) {
  const normalizedCountry = country.trim().toLowerCase();

  return countryCurrencyMap[normalizedCountry] ?? { code: 'EUR', locale: 'nl-NL' };
}

export function formatPriceForCountry(country: string, rawValue: string) {
  const numericValue = Number.parseFloat(rawValue.replace(',', '.').replace(/[^\d.]/g, ''));

  if (Number.isNaN(numericValue)) {
    return rawValue;
  }

  const { code, locale } = getCurrencyConfig(country);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}
