export const postTypes = [
  {
    id: 'hero',
    label: 'Hero Post',
    icon: '⭐',
    description: 'Product deep dive',
    angles: [
      { id: 'product_knowledge', label: 'Product Knowledge', prompt: 'อธิบายว่าสินค้านี้คืออะไร ทำงานอย่างไร ทำจากวัสดุอะไร และเหมาะกับงานประเภทใด' },
      { id: 'comparison', label: 'Product Comparison', prompt: 'เปรียบเทียบสินค้านี้กับตัวเลือกอื่น ๆ ในกลุ่มเดียวกัน ว่าแตกต่างกันอย่างไรและแต่ละแบบเหมาะกับสถานการณ์ใด' },
      { id: 'buyer_faq', label: 'Buyer FAQ', prompt: 'ตอบคำถามที่ฝ่ายจัดซื้อมักสงสัยเมื่อสั่งซื้อสินค้านี้ เช่น ขนาด จำนวน มาตรฐาน อายุการใช้งาน' },
      { id: 'use_case', label: 'Use Case', prompt: 'แสดงการใช้งานจริงในโรงงานหรือห้องปฏิบัติการ อธิบายว่าช่วยแก้ปัญหาอะไรและใช้งานอย่างไรให้ถูกวิธี' },
      { id: 'checklist', label: 'Buying Checklist', prompt: 'สร้าง checklist สิ่งที่ต้องพิจารณาก่อนสั่งซื้อสินค้านี้ เหมาะสำหรับฝ่ายจัดซื้อที่ต้องการเลือกซื้ออย่างถูกต้อง' },
      { id: 'problem_solution', label: 'Problem & Solution', prompt: 'อธิบายปัญหาที่พบบ่อยในโรงงาน เช่น ESD damage การปนเปื้อน หรืออุบัติเหตุ และอธิบายว่าสินค้านี้ช่วยป้องกันได้อย่างไร' },
    ],
  },
  {
    id: 'category',
    label: 'Category Post',
    icon: '📦',
    description: 'Product group overview',
    angles: [
      { id: 'category_overview', label: 'Category Guide', prompt: 'ภาพรวมสินค้าทั้งกลุ่ม อธิบายความแตกต่างระหว่างแต่ละประเภทในกลุ่มนี้ และวิธีเลือกให้เหมาะกับงาน' },
      { id: 'selection_guide', label: 'Selection Guide', prompt: 'แนะนำวิธีเลือกสินค้าในกลุ่มนี้ให้เหมาะกับแผนกต่าง ๆ ในโรงงาน เช่น QC, Production, Warehouse' },
      { id: 'quantity_guide', label: 'Quantity Planning', prompt: 'แนะนำการวางแผนจำนวนและสต็อกสินค้าในกลุ่มนี้ เพื่อไม่ให้หยุดสายการผลิตเพราะสินค้าหมด' },
      { id: 'top_mistakes', label: 'Common Mistakes', prompt: 'ความผิดพลาดที่พบบ่อยเมื่อเลือกซื้อหรือใช้งานสินค้าในกลุ่มนี้ พร้อมวิธีหลีกเลี่ยง' },
    ],
  },
  {
    id: 'industry',
    label: 'Industry Post',
    icon: '🏭',
    description: 'Sector-specific content',
    angles: [
      { id: 'electronics', label: 'Electronics Factory', prompt: 'แนะนำการใช้สินค้านี้ในโรงงานอิเล็กทรอนิกส์ เน้นการป้องกัน ESD ชิ้นส่วน PCB และ SMT' },
      { id: 'food', label: 'Food Processing', prompt: 'แนะนำการใช้สินค้านี้ในโรงงานอาหาร เน้นความสะอาด GMP HACCP และการป้องกันการปนเปื้อน' },
      { id: 'pharma', label: 'Pharma & Lab', prompt: 'แนะนำการใช้สินค้านี้ในอุตสาหกรรมยาและห้องแล็บ เน้นมาตรฐาน GMP และ Cleanroom class' },
      { id: 'hospital', label: 'Healthcare', prompt: 'แนะนำการใช้สินค้านี้ในโรงพยาบาลและสถานพยาบาล เน้นความปลอดภัยและการป้องกันเชื้อ' },
    ],
  },
  {
    id: 'buyer',
    label: 'Buyer Post',
    icon: '🧾',
    description: 'For procurement managers',
    angles: [
      { id: 'purchasing_tips', label: 'Purchasing Tips', prompt: 'เคล็ดลับและสิ่งที่ควรรู้สำหรับฝ่ายจัดซื้อที่ต้องการสั่งสินค้าความปลอดภัยอุตสาหกรรมให้คุ้มค่าและถูกต้อง' },
      { id: 'shopee_vs_direct', label: 'Shopee vs Direct Quote', prompt: 'เปรียบเทียบการสั่งซื้อผ่าน Shopee กับการขอใบเสนอราคาโดยตรง กรณีใดเหมาะกับแต่ละแบบ' },
      { id: 'safety_stock', label: 'Safety Stock Planning', prompt: 'วิธีวางแผน Safety Stock สำหรับสินค้าสิ้นเปลืองในโรงงาน เพื่อไม่ให้กระทบสายการผลิต' },
    ],
  },
  {
    id: 'trust',
    label: 'Brand Trust',
    icon: '🏆',
    description: 'Build brand credibility',
    angles: [
      { id: 'brand_story', label: 'Idealglobe Story', prompt: 'แนะนำบริษัท Idealglobe ว่าเป็นใคร จัดจำหน่ายสินค้าอะไร ให้บริการ B2B อย่างไร และทำไมถึงเป็นทางเลือกที่น่าเชื่อถือ' },
      { id: 'why_choose', label: 'Why Choose Idealglobe', prompt: 'เหตุผลที่โรงงานควรเลือก Idealglobe เป็นซัพพลายเออร์ด้านสินค้าความปลอดภัยและ Cleanroom' },
    ],
  },
  {
    id: 'promotion',
    label: 'Promotion',
    icon: '🎁',
    description: 'Bundles & reorder reminders',
    angles: [
      { id: 'bundle_esd', label: 'ESD Bundle', prompt: 'แนะนำชุดสินค้า ESD ครบเซ็ต ได้แก่ Antistatic Tape + Rubber Band + Antistatic Cloth สั่งรวมคุ้มกว่า' },
      { id: 'bundle_cleanroom', label: 'Cleanroom Bundle', prompt: 'แนะนำชุดสินค้า Cleanroom Entry ครบเซ็ต ได้แก่ Sticky Mat + Shoe Cover + Cleanroom Wiper' },
      { id: 'monthly_reorder', label: 'Monthly Reorder', prompt: 'เตือนให้สั่งสินค้าสิ้นเปลืองประจำเดือน บอกสินค้าที่โรงงานต้องสต็อกทุกเดือนและเหตุผลที่ไม่ควรปล่อยให้หมด' },
    ],
  },
]
