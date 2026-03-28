import type { VendorTabRecord } from '../types/vendor';

export type VendorSearchResult = {
  matchedField: 'vendor' | 'category' | 'product';
  matchedProductName?: string;
  record: VendorTabRecord;
};

export function searchVendorRecords(
  records: VendorTabRecord[],
  query: string
): VendorSearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return records.map((record) => ({
      matchedField: 'vendor',
      record,
    }));
  }

  return records.reduce<VendorSearchResult[]>((results, record) => {
    const vendorName = record.vendor.businessName.toLowerCase();
    const category = record.vendor.category.toLowerCase();
    const matchedProduct = record.products.find((product) =>
      product.name.toLowerCase().includes(normalizedQuery)
    );

    if (vendorName.includes(normalizedQuery)) {
      results.push({
        matchedField: 'vendor',
        record,
      });
      return results;
    }

    if (category.includes(normalizedQuery)) {
      results.push({
        matchedField: 'category',
        record,
      });
      return results;
    }

    if (matchedProduct) {
      results.push({
        matchedField: 'product',
        matchedProductName: matchedProduct.name,
        record,
      });
    }

    return results;
  }, []);
}
