import { MENU_DATA } from './menuData';
import { supabase, isSupabaseConfigured } from '../supabase';
import { localDB } from './localDemoEngine';

export const seedMenu = async () => {
  try {
    const menuWithIds = MENU_DATA.map((item, index) => ({
      ...item,
      itemId: item.itemId || `menu_${index}`,
      isAvailable: true,
    }));

    if (!isSupabaseConfigured) {
      localDB.resetMenuToDefault();
      return;
    }

    const { error } = await supabase.from('menu').upsert(menuWithIds, { onConflict: 'itemId' });

    if (error) {
      throw error;
    }

    console.log('Menu seeded successfully!');
  } catch (error) {
    console.error('Error seeding menu:', error);
    throw error;
  }
};
