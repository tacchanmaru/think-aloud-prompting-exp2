import { product1, product2, product3, practiceData, Product } from './products';

export enum ExperimentPageType {
  ManualEdit = 'manual-edit',
  ThinkAloud = 'think-aloud',
  TextPrompting = 'text-prompting'
}

export function getProductForExperiment(userId: number | null, pageType: ExperimentPageType, isPractice: boolean = false): Product {
  // Practice mode always uses pencil
  if (isPractice) {
    return practiceData;
  }

  // If no userId, default to product1 (ferret)
  if (!userId) {
    return product1;
  }

  const remainder = userId % 12;

  if (pageType === ExperimentPageType.ManualEdit) {
    if (remainder === 0 || remainder === 3 || remainder === 6 || remainder === 9) {
      return product1; // フェレット
    } else if (remainder === 1 || remainder === 4 || remainder === 7 || remainder === 10) {
      return product2; // ペンギン
    } else {
      return product3; // くま
    }
  } else if (pageType === ExperimentPageType.TextPrompting) {
    if (remainder === 2 || remainder === 4 || remainder === 7 || remainder === 11) {
      return product1; // フェレット
    } else if (remainder === 0 || remainder === 5 || remainder === 8 || remainder === 9) {
      return product2; // ペンギン
    } else {
      return product3; // くま
    }
  } else if (pageType === ExperimentPageType.ThinkAloud) {
    if (remainder === 1 || remainder === 5 || remainder === 8 || remainder === 10) {
      return product1; // フェレット
    } else if (remainder === 2 || remainder === 3 || remainder === 6 || remainder === 11) {
      return product2; // ペンギン
    } else {
      return product3; // くま
    }
  }

  // Fallback to product1
  return product1;
}
