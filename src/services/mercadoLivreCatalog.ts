import { Product } from '../types';
import { calculateProfit, getEstimatedCommissionRate } from './affiliateScraper';

export interface MeliCatalogProduct {
  id: string;
  title: string;
  category: string;
  originalPrice: number;
  promotionalPrice: number;
  discountPercentage: number;
  imageUrl: string;
  permalink: string;
  installments: string;
  freeShipping: boolean;
  couponCode?: string;
  rating: number;
  reviewsCount: number;
}

export const MELI_FEATURED_PRODUCTS: MeliCatalogProduct[] = [
  // Eletrodomésticos & Cozinha
  {
    id: 'meli_airfryer_mondial',
    title: 'Fritadeira Elétrica Sem Óleo Air Fryer Mondial AFN-40-BI 4L Inox Preto 1500W',
    category: 'Eletrodomésticos',
    originalPrice: 449.90,
    promotionalPrice: 249.90,
    discountPercentage: 44,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_782414-MLA74676572714_022024-F.webp',
    permalink: 'https://www.mercadolivre.com.br/fritadeira-eletrica-sem-oleo-air-fryer-mondial-afn-40-bi-4l-inox-preto-1500w/p/MLB19827461',
    installments: '8x de R$ 31,23 sem juros',
    freeShipping: true,
    couponCode: 'CASA15',
    rating: 4.9,
    reviewsCount: 14820,
  },
  {
    id: 'meli_robo_aspirador_wap',
    title: 'Robô Aspirador de Pó Wap Robot W100 Bivolt Automático 3 em 1 Varre Aspira Passa Pano',
    category: 'Casa, Móveis e Decoração',
    originalPrice: 599.00,
    promotionalPrice: 389.00,
    discountPercentage: 35,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_618950-MLA49774607736_042022-F.webp',
    permalink: 'https://www.mercadolivre.com.br/robo-aspirador-de-po-wap-robot-w100-bivolt-automatico-3em1/p/MLB16182211',
    installments: '10x de R$ 38,90 sem juros',
    freeShipping: true,
    couponCode: 'WAP50OFF',
    rating: 4.8,
    reviewsCount: 9240,
  },
  {
    id: 'meli_cafeteira_nespresso',
    title: 'Cafeteira Nespresso Essenza Mini 110V Preto Piano Compacta com 14 Cápsulas Grátis',
    category: 'Eletrodomésticos',
    originalPrice: 549.90,
    promotionalPrice: 379.00,
    discountPercentage: 31,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_894210-MLA48192847291_112021-F.webp',
    permalink: 'https://www.mercadolivre.com.br/cafeteira-nespresso-essenza-mini-preto/p/MLB18293741',
    installments: '10x de R$ 37,90 sem juros',
    freeShipping: true,
    couponCode: 'CAFE10',
    rating: 4.9,
    reviewsCount: 6510,
  },

  // Celulares & Smartphones
  {
    id: 'meli_samsung_galaxy_a55',
    title: 'Smartphone Samsung Galaxy A55 5G 128GB 8GB RAM Câmera Tripla 50MP Tela Super AMOLED 6.6"',
    category: 'Celulares e Informática',
    originalPrice: 2299.00,
    promotionalPrice: 1699.00,
    discountPercentage: 26,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_912847-MLA75283918234_032024-F.webp',
    permalink: 'https://www.mercadolivre.com.br/smartphone-samsung-galaxy-a55-5g-128gb-8gb-ram-azul-escuro/p/MLB36829141',
    installments: '10x de R$ 169,90 sem juros',
    freeShipping: true,
    couponCode: 'GALAXY100',
    rating: 4.8,
    reviewsCount: 3400,
  },
  {
    id: 'meli_xiaomi_redmi_note_13',
    title: 'Xiaomi Redmi Note 13 4G 256GB 8GB RAM Versão Global Câmera 108MP Bateria 5000mAh',
    category: 'Celulares e Informática',
    originalPrice: 1599.00,
    promotionalPrice: 1149.00,
    discountPercentage: 28,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_736291-MLA74182938172_012024-F.webp',
    permalink: 'https://www.mercadolivre.com.br/xiaomi-redmi-note-13-4g-256gb-8gb-ram-versao-global/p/MLB35928172',
    installments: '12x de R$ 95,75 sem juros',
    freeShipping: true,
    rating: 4.8,
    reviewsCount: 8900,
  },
  {
    id: 'meli_motorola_moto_g84',
    title: 'Motorola Moto G84 5G 256GB 8GB RAM Viva Magenta Tela pOLED 120Hz Som Dolby Atmos',
    category: 'Celulares e Informática',
    originalPrice: 1799.00,
    promotionalPrice: 1299.00,
    discountPercentage: 27,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_847291-MLA72839182734_102023-F.webp',
    permalink: 'https://www.mercadolivre.com.br/motorola-moto-g84-5g-256gb-8gb-ram-viva-magenta/p/MLB28192834',
    installments: '10x de R$ 129,90 sem juros',
    freeShipping: true,
    rating: 4.7,
    reviewsCount: 4210,
  },

  // Eletrônicos & Áudio
  {
    id: 'meli_jbl_go_4',
    title: 'Caixa de Som Portátil JBL GO 4 Bluetooth à Prova d Água IP67 Som Pro JBL Bateria 7h',
    category: 'Eletrônicos e Áudio',
    originalPrice: 299.90,
    promotionalPrice: 199.00,
    discountPercentage: 33,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_654928-MLA76281928374_042024-F.webp',
    permalink: 'https://www.mercadolivre.com.br/caixa-de-som-portatil-jbl-go-4-bluetooth-prova-d-agua-ip67/p/MLB37281928',
    installments: '4x de R$ 49,75 sem juros',
    freeShipping: true,
    couponCode: 'JBL10OFF',
    rating: 4.9,
    reviewsCount: 5120,
  },
  {
    id: 'meli_fone_jbl_tune_520bt',
    title: 'Headphone Fone de Ouvido Sem Fio JBL Tune 520BT Bluetooth Pure Bass Bateria de 57 Horas',
    category: 'Eletrônicos e Áudio',
    originalPrice: 299.00,
    promotionalPrice: 199.90,
    discountPercentage: 33,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_729182-MLA71829381726_092023-F.webp',
    permalink: 'https://www.mercadolivre.com.br/headphone-sem-fio-jbl-tune-520bt-pure-bass-preto/p/MLB24192837',
    installments: '3x de R$ 66,63 sem juros',
    freeShipping: true,
    rating: 4.9,
    reviewsCount: 11200,
  },

  // Informática & Smart Home
  {
    id: 'meli_alexa_echo_dot_5',
    title: 'Smart Speaker Amazon Echo Dot 5ª Geração com Alexa Cor Preta Som Mais Potente',
    category: 'Eletrônicos e Áudio',
    originalPrice: 429.00,
    promotionalPrice: 299.00,
    discountPercentage: 30,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_619283-MLA52819283746_122022-F.webp',
    permalink: 'https://www.mercadolivre.com.br/smart-speaker-amazon-echo-dot-5-geraco-alexa-preta/p/MLB19283746',
    installments: '6x de R$ 49,83 sem juros',
    freeShipping: true,
    rating: 4.9,
    reviewsCount: 22400,
  },
  {
    id: 'meli_monitor_gamer_lg_24',
    title: 'Monitor Gamer LG UltraGear 24" IPS Full HD 144Hz 1ms AMD FreeSync Premium DisplayPort HDMI',
    category: 'Celulares e Informática',
    originalPrice: 999.00,
    promotionalPrice: 699.00,
    discountPercentage: 30,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_829103-MLA51928374652_102022-F.webp',
    permalink: 'https://www.mercadolivre.com.br/monitor-gamer-lg-ultragear-24-ips-144hz-1ms/p/MLB19283751',
    installments: '10x de R$ 69,90 sem juros',
    freeShipping: true,
    couponCode: 'TECH50',
    rating: 4.8,
    reviewsCount: 6800,
  },

  // Moda & Calçados
  {
    id: 'meli_tenis_olympikus_corre',
    title: 'Tênis Esportivo Masculino Olympikus Corre 3 Conforto Leveza Corrida Amortecimento',
    category: 'Moda e Acessórios',
    originalPrice: 499.90,
    promotionalPrice: 299.90,
    discountPercentage: 40,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_918273-MLA72918273645_112023-F.webp',
    permalink: 'https://www.mercadolivre.com.br/tenis-masculino-olympikus-corre-3-corrida-original/p/MLB29182736',
    installments: '6x de R$ 49,98 sem juros',
    freeShipping: true,
    couponCode: 'MODA15',
    rating: 4.8,
    reviewsCount: 4320,
  },
  {
    id: 'meli_kit_cuecas_calvin_klein',
    title: 'Kit 3 Cuecas Boxer Masculinas Calvin Klein Cotton Stretch Algodão Elastano Confort',
    category: 'Moda e Acessórios',
    originalPrice: 199.90,
    promotionalPrice: 129.90,
    discountPercentage: 35,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_726192-MLA62918273645_072023-F.webp',
    permalink: 'https://www.mercadolivre.com.br/kit-3-cuecas-boxer-calvin-klein-cotton-stretch/p/MLB28192019',
    installments: '3x de R$ 43,30 sem juros',
    freeShipping: true,
    rating: 4.9,
    reviewsCount: 5890,
  },

  // Ferramentas & Casa
  {
    id: 'meli_parafusadeira_bosch',
    title: 'Parafusadeira e Furadeira de Impacto Bosch GSB 180-LI 18V Bivolt com 2 Baterias e Maleta',
    category: 'Automotivo',
    originalPrice: 899.00,
    promotionalPrice: 599.00,
    discountPercentage: 33,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_819283-MLA48192837465_112021-F.webp',
    permalink: 'https://www.mercadolivre.com.br/parafusadeira-furadeira-impacto-bosch-gsb-180-li-18v/p/MLB17281928',
    installments: '10x de R$ 59,90 sem juros',
    freeShipping: true,
    couponCode: 'BOSCH50',
    rating: 4.9,
    reviewsCount: 7100,
  },
];

/**
 * Builds a full Product object from a Meli Catalog item using user affiliate settings
 */
export function formatMeliCatalogProduct(
  item: MeliCatalogProduct,
  affiliateTag = 'afiliado_zap_vip'
): Product {
  const commissionRate = getEstimatedCommissionRate('mercadolivre', item.category);
  const estimatedProfit = calculateProfit(item.promotionalPrice, commissionRate);

  let affiliateUrl = item.permalink;
  try {
    const urlObj = new URL(item.permalink);
    urlObj.searchParams.set('matt_tool', 'affiliate_zap');
    urlObj.searchParams.set('tracking_id', affiliateTag || 'afiliado_zap');
    affiliateUrl = urlObj.toString();
  } catch {}

  return {
    id: `prod_meli_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    title: item.title,
    description: `Oferta imperdível no Mercado Livre! ${item.discountPercentage}% de desconto com envio rápido FULL.`,
    originalPrice: item.originalPrice,
    promotionalPrice: item.promotionalPrice,
    discountPercentage: item.discountPercentage,
    marketplace: 'mercadolivre',
    originalUrl: item.permalink,
    affiliateUrl,
    imageUrl: item.imageUrl,
    category: item.category,
    commissionRate,
    estimatedProfit,
    couponCode: item.couponCode,
    freeShipping: item.freeShipping,
    installments: item.installments,
    rating: item.rating,
    reviewsCount: item.reviewsCount,
    createdAt: new Date().toISOString(),
  };
}
