import { MENU_DATA } from './menuData';
import { supabase } from '../supabase';

export const seedMenu = async () => {
  try {
    const menuWithIds = MENU_DATA.map((item, index) => ({
      ...item,
      itemId: 'menu_' + index,
      isAvailable: true,
    }));

    // Clear existing menu (optional, but good for seeding)
    // const { error: deleteError } = await supabase.from('menu').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { error } = await supabase.from('menu').insert(menuWithIds);

    if (error) {
      throw error;
    }
    
    console.log('Menu seeded successfully!');
    alert('Menu seeded successfully!');
  } catch (error) {
    console.error('Error seeding menu:', error);
    alert('Error seeding menu');
  }
};
