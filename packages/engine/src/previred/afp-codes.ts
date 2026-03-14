/**
 * AFP code mapping: internal code -> Previred numeric code
 * Source: Previred/Superintendencia de Pensiones official codes
 */
export const AFP_PREVIRED_CODES: Record<string, string> = {
  capital:   '03',
  cuprum:    '02',
  habitat:   '05',
  planvital: '01',
  provida:   '08',
  modelo:    '28',
  uno:       '34',
};

/**
 * Health code mapping: internal code -> Previred numeric code
 */
export const HEALTH_PREVIRED_CODES: Record<string, string> = {
  fonasa: '07',
  // ISAPRE codes (sample — real codes from Previred spec):
  banmedica:    '61',
  colmena:      '64',
  consalud:     '62',
  cruzblanca:   '65',
  esencial:     '70',
  masvida:      '66',
  nuevamasvida: '67',
  vidatres:     '68',
};
