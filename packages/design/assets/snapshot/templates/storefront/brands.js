/* Brand configurations for the shared Patterson storefront shell.
   Dental and Veterinary run on the same pattern library (v5.7.2);
   only the brand label, categories, hero and catalog differ. */
window.STOREFRONT_BRANDS = {
  dental: {
    key: 'dental',
    name: 'Patterson Dental',
    sub: 'Dental',
    phone: '1.800.873.7683',
    utility: ['Support', 'Resources', 'Blog', 'Advantage Rewards', 'Education'],
    nav: ['Merchandise', 'Equipment & Technology', 'Services', 'Software'],
    flyout: {
      'Merchandise': ['New Arrivals', 'Deals & Promotions', 'Patterson Private Brand', 'Office Supplies', 'Browse by Manufacturer', 'Custom Products & Services'],
      'Equipment & Technology': ['CAD/CAM', '3D Printers', 'Digital Scanners', 'Imaging & X-ray', 'Infection Control', 'Operatory & Chairs'],
      'Services': ['Repair & Support', 'Office Design', 'Financial Services', 'Practice Transitions', 'Multilocation Solutions'],
      'Software': ['Eaglesoft', 'Fuse', 'Dolphin', 'Patient Engagement', 'Revenue Cycle Management', 'Clinical Excellence'],
    },
    heroEyebrow: '150,000+ solutions · unmatched support',
    heroTitle: 'Everything your practice needs, from toothbrushes to technology',
    heroBody: 'Find the products, equipment, technology and services your practice needs — then count on our trusted, responsive teams for unwavering support.',
    quickLinks: ['Shop Patterson Brand products', 'Modernize with equipment & technology', 'Patterson software solutions', 'Patterson resource center', 'Connect with a local rep', 'Get Advantage Rewards'],
    products: [
      { name: 'Patterson Topical Anesthetic Gel – 1 oz', note: 'Now available in three dye-free flavors', tag: 'New', tone: 'sky' },
      { name: 'Demi Pro Dental Curing Light – Complete Kit', note: 'Cordless, lightweight; built for comfort and control', tag: 'Featured', tone: 'navy' },
      { name: 'ZenSeal Pro Bioceramic Root Canal Sealer', note: 'Less waste, more applications with ZenSave™ Tip', tag: 'New', tone: 'sky' },
    ],
    manufacturers: ['Solventum', 'Dentsply', 'KAVO', 'CandidPro'],
    testimonial: { quote: 'Investing in technologies has re-energized our staff, increased referrals and case acceptance, and streamlined our treatment planning.', who: 'David Juliani, DDS', where: 'Rochester Hills, Michigan' },
    legal: '© 2026 Patterson Dental Supply, Inc. All rights reserved.',
  },
  vet: {
    key: 'vet',
    name: 'Patterson Veterinary',
    sub: 'Veterinary',
    phone: '1.800.225.7911',
    utility: ['Support', 'Production Animal', 'Equine', 'Blog', 'Resources', 'Pivetal'],
    nav: ['Merchandise', 'Equipment', 'Software', 'Services'],
    flyout: {
      'Merchandise': ['New Arrivals', 'Deals & Promotions', 'Pivetal Brand', 'Pharmaceuticals', 'Browse by Manufacturer', 'Production Animal'],
      'Equipment': ['Anesthesia', 'Dental', 'Diagnostic Imaging', 'In-House Lab', 'Monitoring', 'Surgical'],
      'Software': ['NaVetor', 'Patient Engagement', 'Practice Management', 'Payments', 'Reminders'],
      'Services': ['Repair & Support', 'Equipment Service', 'Financial Services', 'Practice Solutions', 'Technology'],
    },
    heroEyebrow: 'Supplies, equipment & services for every practice',
    heroTitle: 'Helping you care for animals — and run a thriving practice',
    heroBody: 'From everyday essentials and pharmaceuticals to equipment, software and production-animal solutions, we supply veterinarians with the tools and support to deliver exceptional care.',
    quickLinks: ['Shop Pivetal products', 'Equipment & technology', 'Veterinary software solutions', 'Production animal solutions', 'Connect with a rep', 'Resource center'],
    products: [
      { name: 'Pivetal Exam Gloves – Nitrile, 200 ct', note: 'Powder-free, textured grip for everyday procedures', tag: 'New', tone: 'teal' },
      { name: 'NaVetor Cloud Practice Software', note: 'Run your whole practice from anywhere', tag: 'Featured', tone: 'navy' },
      { name: 'Pivetal Vet Wrap – Assorted Colors', note: 'Cohesive bandage, strong and breathable', tag: 'New', tone: 'teal' },
    ],
    manufacturers: ['Zoetis', 'Boehringer Ingelheim', 'Merck', 'IDEXX'],
    testimonial: { quote: 'Patterson is more than a supplier — their team understands our practice and helps us deliver better care every day.', who: 'Dr. Marcus Lane, DVM', where: 'Bend, Oregon' },
    legal: '© 2026 Patterson Veterinary Supply, Inc. All rights reserved.',
  },
};
