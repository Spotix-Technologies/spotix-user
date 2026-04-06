/**
 * Calculates the VAT fee for each ticket price
 * This is to ensure burden of fee is on users, not event creators
 * Formula: (5% of ticket price) + 100
 * @param ticketPrice - The original ticket price (must be a number)
 * @returns The VAT fee amount (as a number)
 */
export const calculateVATFee = (ticketPrice: number): number => {
  const percentageFee = ticketPrice * 0.05; // 5% of ticket price
  const flatFee = 100; // Fixed flat fee
  const totalVATFee = percentageFee + flatFee; // Add them together
  
  return totalVATFee;
};

/**
 * Calculate the final ticket price including VAT
 * Example: For a ₦5,000 ticket:
 *   - Original price: 5,000
 *   - VAT fee: 350 (from calculateVATFee)
 *   - Final price: 5,350
 * 
 * @param ticketPrice - The original ticket price (must be a number)
 * @returns The final price (original price + VAT fee, as a number)
 */
export const calculateFinalPrice = (ticketPrice: number): number => {
  const vatFee = calculateVATFee(ticketPrice);
  const finalPrice = ticketPrice + vatFee; // Add original price + VAT
  
  return finalPrice;
};

/**
 * Get pricing breakdown for a ticket
 * @param ticketPrice - The original ticket price
 * @returns Object containing original price, VAT fee, and final price
 */
export const getPricingBreakdown = (ticketPrice: number) => {
  const vatFee = calculateVATFee(ticketPrice);
  const finalPrice = calculateFinalPrice(ticketPrice);

  return {
    originalPrice: ticketPrice,
    vatFee,
    finalPrice,
  };
};
