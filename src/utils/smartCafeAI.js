/**
 * Chatter & Platter Smart AI Engine
 * Deterministic, ultra-fast on-device cafe intelligence for recommendations,
 * ETA prediction, natural-language order parsing, kitchen batching, and BI analytics.
 */

const getTimePeriod = () => {
  const hour = new Date().getHours();
  if (hour < 11) return { key: 'morning', label: 'Morning Boost', hint: 'Fresh chai, coffee & light bites' };
  if (hour < 16) return { key: 'afternoon', label: 'Afternoon Refuel', hint: 'Filling pasta, sandwiches & coolers' };
  if (hour < 20) return { key: 'evening', label: 'Evening Adda', hint: 'Hot momos, masala Maggi & kulhad chai' };
  return { key: 'night', label: 'Late-Night Study', hint: 'Strong coffee, cheese Maggi & shakes' };
};

export const AI_MOOD_PRESETS = [
  { id: 'chai-time', label: 'Rainy Chai & Snacks', query: 'hot chai maggi momo comfort' },
  { id: 'study-fuel', label: 'Study Fuel', query: 'coffee cold coffee energy quick' },
  { id: 'spicy', label: 'Spicy Craving', query: 'spicy peri masala arrabbiata momo' },
  { id: 'cheesy', label: 'Cheese Lover', query: 'cheesy cheese alfredo fries maggi momo' },
  { id: 'budget', label: 'Under ₹60', query: 'under 60 budget quick' },
  { id: 'chilled', label: 'Beat the Heat', query: 'chilled mojito shake cold refreshing' },
];

/**
 * Recommends menu items from natural language or mood prompts.
 */
export const recommendMenuItems = (menu = [], rawQuery = '', { vegOnly = false, limit = 6 } = {}) => {
  const available = menu.filter(m => m.isAvailable !== false && (!vegOnly || m.isVeg !== false));
  const query = rawQuery.trim().toLowerCase();
  const timeInfo = getTimePeriod();

  // Extract budget constraint like "under 80", "< 100", "below 60"
  const budgetMatch = query.match(/(?:under|below|<|max)\s*₹?\s*(\d+)/i);
  const maxBudget = budgetMatch ? Number(budgetMatch[1]) : null;

  const keywords = query
    .replace(/(?:under|below|<|max)\s*₹?\s*\d+/gi, '')
    .split(/[\s,+&]+/)
    .filter(w => w.length > 1 && !['for', 'the', 'and', 'with', 'something', 'want', 'give', 'best'].includes(w));

  const scored = available
    .filter(item => !maxBudget || Number(item.price) <= maxBudget)
    .map(item => {
      let score = 0;
      const reasons = [];
      const itemText = `${item.name} ${item.category} ${item.description || ''} ${(item.tags || []).join(' ')}`.toLowerCase();

      if ((item.tags || []).includes('bestseller')) {
        score += 3;
        reasons.push('Campus favorite');
      }

      // Time-of-day relevance
      if (timeInfo.key === 'morning' && (item.category === 'HOT' || item.category === 'SANDWICH')) {
        score += 2;
      } else if (timeInfo.key === 'afternoon' && (item.category === 'COLD' || item.category === 'PASTA' || item.category === 'SANDWICH')) {
        score += 2;
      } else if (timeInfo.key === 'evening' && (item.category === 'MOMO' || item.category === 'MAGGI' || item.category === 'HOT')) {
        score += 2;
      } else if (timeInfo.key === 'night' && ((item.tags || []).includes('study-fuel') || (item.tags || []).includes('cheesy'))) {
        score += 2;
      }

      if (keywords.length > 0) {
        let matched = 0;
        for (const kw of keywords) {
          if (item.name.toLowerCase().includes(kw)) {
            score += 8;
            matched++;
          } else if (itemText.includes(kw)) {
            score += 5;
            matched++;
          }
        }
        if (matched > 0) {
          reasons.unshift(`Matches "${keywords.slice(0, 2).join(', ')}"`);
        } else {
          score -= 3;
        }
      }

      if (maxBudget) {
        reasons.unshift(`Fits ≤ ₹${maxBudget}`);
        score += 2;
      }

      if (reasons.length === 0) {
        reasons.push(timeInfo.label);
      }

      return {
        ...item,
        aiScore: score,
        aiReason: reasons[0],
      };
    });

  scored.sort((a, b) => b.aiScore - a.aiScore || a.price - b.price);
  return {
    timeInfo,
    maxBudget,
    items: scored.slice(0, limit),
  };
};

/**
 * Builds curated 1-tap combos dynamically from live available menu items.
 */
export const getSmartCombos = (menu = []) => {
  const findAvailable = (nameFragment) =>
    menu.find(m => m.isAvailable !== false && m.name.toLowerCase().includes(nameFragment.toLowerCase()));

  const candidates = [
    {
      id: 'combo_chai_adda',
      title: 'Chai & Maggi Adda',
      badge: 'Most Ordered',
      subtitle: 'Perfect rainy-day campus break',
      items: [findAvailable('Masala Tea') || findAvailable('Kulhad Tea'), findAvailable('Veg Masala Maggi') || findAvailable('Veg Maggi')],
    },
    {
      id: 'combo_study_fuel',
      title: 'Late-Night Study Fuel',
      badge: 'Brain Boost',
      subtitle: 'Stay sharp without breaking budget',
      items: [findAvailable('Cold Coffee') || findAvailable('Kulhad Coffee'), findAvailable('Cheese Fries') || findAvailable('Peri-Peri Fries')],
    },
    {
      id: 'combo_momo_chill',
      title: 'Momo & Mojito Duo',
      badge: 'Squad Pick',
      subtitle: 'Fiery dumplings + zesty cooler',
      items: [findAvailable('Steamed/Fried Veg Momos'), findAvailable('Virgin Mojito') || findAvailable('Fresh Lime')],
    },
  ];

  return candidates
    .map(combo => {
      const validItems = combo.items.filter(Boolean);
      if (validItems.length < 2) return null;
      const total = validItems.reduce((sum, i) => sum + Number(i.price), 0);
      return {
        ...combo,
        items: validItems,
        total,
        prepMinutes: Math.max(...validItems.map(i => i.prepMinutes || 6)),
      };
    })
    .filter(Boolean);
};

/**
 * Suggests complementary pairings for items already in the cart.
 */
export const getCartPairings = (menu = [], cart = []) => {
  if (!cart.length || !menu.length) return [];
  const cartIds = new Set(cart.map(c => String(c.itemId || c.id)));
  const categoriesInCart = new Set(cart.map(c => c.category).filter(Boolean));

  const hasDrink = categoriesInCart.has('HOT') || categoriesInCart.has('COLD');
  const hasFood = ['MOMO', 'MAGGI', 'FRIES', 'PASTA', 'SANDWICH'].some(c => categoriesInCart.has(c));

  const available = menu.filter(m => m.isAvailable !== false && !cartIds.has(String(m.id || m.itemId)));

  let prioritized = [];
  if (hasFood && !hasDrink) {
    prioritized = available.filter(m => m.category === 'HOT' || m.category === 'COLD');
  } else if (hasDrink && !hasFood) {
    prioritized = available.filter(m => ['MOMO', 'FRIES', 'MAGGI', 'SANDWICH'].includes(m.category));
  } else {
    prioritized = available.filter(m => (m.tags || []).includes('bestseller') || m.price <= 69);
  }

  return prioritized
    .sort((a, b) => ((b.tags || []).includes('bestseller') ? 1 : 0) - ((a.tags || []).includes('bestseller') ? 1 : 0) || a.price - b.price)
    .slice(0, 3);
};

/**
 * Predicts kitchen preparation time in minutes based on items + live active queue.
 */
export const estimateOrderPrepMinutes = (items = [], activeOrders = [], rushMode = false) => {
  const maxItemPrep = items.length
    ? Math.max(...items.map(i => Number(i.prepMinutes) || 6))
    : 6;
  const activeQueueCount = activeOrders.filter(o => ['approved', 'cooking'].includes(o.status)).length;
  const queuePenalty = Math.min(12, activeQueueCount * 2);
  const rushPenalty = rushMode ? 4 : 0;
  return Math.max(4, Math.round(maxItemPrep + queuePenalty + rushPenalty));
};

/**
 * Natural-language quick order parser for Reception CRM.
 * Example: "2 masala tea, 1 veg momo table 4"
 */
export const parseNaturalOrder = (input = '', menu = []) => {
  const clean = input.trim();
  if (!clean) return { matchedItems: [], tableNumber: null, unmatchedSegments: [] };

  let working = clean;
  let tableNumber = null;

  const tableMatch =
    working.match(/\b(?:table|tbl)\s*[#:-]*\s*([a-z0-9]+)\b/i) ||
    working.match(/\bt\s*[#:-]*\s*(\d+)\b/i);
  if (tableMatch) {
    tableNumber = tableMatch[1].toUpperCase();
    working = working.replace(tableMatch[0], ' ');
  }

  const segments = working
    .split(/,|\band\b|\+|&|\n/i)
    .map(s => s.trim())
    .filter(Boolean);

  const matchedItems = [];
  const unmatchedSegments = [];

  for (const seg of segments) {
    const qtyMatch = seg.match(/^(\d+)\s*(?:x|×)?\s*(.+)$/i) || seg.match(/^(.+?)\s*(?:x|×)\s*(\d+)$/i);
    let qty = 1;
    let phrase = seg;

    if (qtyMatch) {
      if (/^\d+$/.test(qtyMatch[1])) {
        qty = Math.max(1, Math.min(20, Number(qtyMatch[1])));
        phrase = qtyMatch[2];
      } else {
        phrase = qtyMatch[1];
        qty = Math.max(1, Math.min(20, Number(qtyMatch[2])));
      }
    }

    const tokens = phrase.toLowerCase().split(/\s+/).filter(Boolean);
    let bestItem = null;
    let bestScore = 0;

    for (const item of menu) {
      if (item.isAvailable === false) continue;
      const itemName = item.name.toLowerCase();
      if (itemName === phrase.toLowerCase()) {
        bestItem = item;
        bestScore = 100;
        break;
      }
      let score = 0;
      if (itemName.includes(phrase.toLowerCase())) score += 20;
      for (const t of tokens) {
        if (itemName.includes(t)) score += 6;
        else if (item.category.toLowerCase().includes(t)) score += 2;
      }
      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }

    if (bestItem && bestScore >= 6) {
      const existing = matchedItems.find(m => (m.id || m.itemId) === (bestItem.id || bestItem.itemId));
      if (existing) {
        existing.qty += qty;
        existing.subtotal = existing.qty * existing.price;
      } else {
        matchedItems.push({
          ...bestItem,
          qty,
          subtotal: qty * bestItem.price,
        });
      }
    } else {
      unmatchedSegments.push(seg);
    }
  }

  return { matchedItems, tableNumber, unmatchedSegments };
};

/**
 * Aggregates items across approved & cooking kitchen tickets for batch cooking.
 */
export const computeKitchenBatchInsights = (orders = []) => {
  const activeKitchen = orders.filter(o => o.status === 'approved' || o.status === 'cooking');
  const itemCounts = {};
  let delayedCount = 0;
  const now = Date.now();

  activeKitchen.forEach(order => {
    const startTime = new Date(order.approvedAt || order.createdAt).getTime();
    const elapsedMins = (now - startTime) / 60000;
    if (elapsedMins >= 10) delayedCount++;

    (order.items || []).forEach(item => {
      const key = item.name;
      if (!itemCounts[key]) {
        itemCounts[key] = { name: key, qty: 0, cookingQty: 0, queuedQty: 0 };
      }
      itemCounts[key].qty += item.qty || 1;
      if (order.status === 'cooking') itemCounts[key].cookingQty += item.qty || 1;
      else itemCounts[key].queuedQty += item.qty || 1;
    });
  });

  const batchList = Object.values(itemCounts).sort((a, b) => b.qty - a.qty);
  return {
    totalActiveTickets: activeKitchen.length,
    delayedCount,
    batchList,
  };
};

/**
 * Simple on-device sentiment classification for feedback comments.
 */
export const analyzeSentiment = (rating, comment = '') => {
  const text = comment.toLowerCase();
  const negWords = ['slow', 'late', 'cold', 'bad', 'worst', 'stale', 'expensive', 'rude', 'wait'];
  const posWords = ['great', 'best', 'love', 'awesome', 'fast', 'tasty', 'fresh', 'hot', 'amazing', 'good'];

  const negHits = negWords.filter(w => text.includes(w)).length;
  const posHits = posWords.filter(w => text.includes(w)).length;

  if (rating >= 4 && negHits === 0) return 'positive';
  if (rating <= 2 || negHits > posHits) return 'negative';
  return 'neutral';
};

/**
 * Generates Owner BI metrics, item leaderboards, category split, and actionable insights.
 */
export const generateOwnerInsights = (orders = [], feedbacks = [], menu = []) => {
  const completedOrders = orders.filter(o => !['cancelled'].includes(o.status));
  const paidOrders = completedOrders.filter(o => o.status !== 'pending_payment');

  // Top selling items
  const itemStats = {};
  const categoryRevenue = {};
  const categoryMap = {};
  menu.forEach(m => {
    categoryMap[m.name] = m.category;
  });

  let prepTimeSum = 0;
  let prepTimeCount = 0;
  const hourCounts = Array(24).fill(0);

  paidOrders.forEach(order => {
    const h = new Date(order.createdAt).getHours();
    if (!Number.isNaN(h)) hourCounts[h] += 1;

    if (order.approvedAt && order.readyAt) {
      const diffMins = (new Date(order.readyAt).getTime() - new Date(order.approvedAt).getTime()) / 60000;
      if (diffMins > 0 && diffMins < 120) {
        prepTimeSum += diffMins;
        prepTimeCount += 1;
      }
    }

    (order.items || []).forEach(item => {
      const name = item.name || 'Item';
      const qty = Number(item.qty) || 1;
      const rev = Number(item.subtotal) || (Number(item.price) || 0) * qty;
      if (!itemStats[name]) itemStats[name] = { name, qty: 0, revenue: 0 };
      itemStats[name].qty += qty;
      itemStats[name].revenue += rev;

      const cat = categoryMap[name] || 'OTHER';
      categoryRevenue[cat] = (categoryRevenue[cat] || 0) + rev;
    });
  });

  const topItems = Object.values(itemStats).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const categoryBreakdown = Object.entries(categoryRevenue)
    .map(([category, revenue]) => ({ category, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  const avgPrepMinutes = prepTimeCount > 0 ? Math.round((prepTimeSum / prepTimeCount) * 10) / 10 : 6.5;

  let peakHour = 17;
  let maxHourOrders = 0;
  hourCounts.forEach((cnt, hr) => {
    if (cnt > maxHourOrders) {
      maxHourOrders = cnt;
      peakHour = hr;
    }
  });

  const avgRating = feedbacks.length
    ? Math.round((feedbacks.reduce((s, f) => s + Number(f.rating || 0), 0) / feedbacks.length) * 10) / 10
    : 4.8;

  const positiveCount = feedbacks.filter(f => (f.sentiment || analyzeSentiment(f.rating, f.comment)) === 'positive').length;
  const positiveRate = feedbacks.length ? Math.round((positiveCount / feedbacks.length) * 100) : 100;
  const outOfStockCount = menu.filter(m => m.isAvailable === false).length;

  const insights = [];
  if (topItems[0]) {
    insights.push({
      type: 'star',
      title: `Top Revenue Driver: ${topItems[0].name}`,
      detail: `Generated ₹${topItems[0].revenue} across ${topItems[0].qty} servings. Feature it at counter for combo upsells.`,
    });
  }
  if (maxHourOrders > 0) {
    insights.push({
      type: 'clock',
      title: `Peak Traffic Window: ${peakHour}:00 – ${peakHour + 1}:00`,
      detail: `${maxHourOrders} orders logged in this slot. Pre-steam momos and prep chai base 15 mins prior.`,
    });
  }
  insights.push({
    type: 'speed',
    title: `Kitchen Speed: ${avgPrepMinutes} min avg`,
    detail: avgPrepMinutes <= 8 ? 'Kitchen is beating the 8-minute target SLA.' : 'Consider activating Rush Mode or batching Maggi/Tea orders.',
  });
  if (outOfStockCount > 0) {
    insights.push({
      type: 'alert',
      title: `${outOfStockCount} Menu Item${outOfStockCount > 1 ? 's' : ''} Out of Stock`,
      detail: 'Restock or temporarily hide depleted items below to keep order completion high.',
    });
  }

  return {
    topItems,
    categoryBreakdown,
    avgPrepMinutes,
    peakHour: `${peakHour}:00`,
    avgRating,
    positiveRate,
    outOfStockCount,
    insights,
  };
};

/**
 * Interactive Q&A responder for Owner Dashboard's "Ask Chatter AI" bar.
 */
export const answerOwnerQuestion = (question = '', { stats, bi, feedbacksCount }) => {
  const q = question.toLowerCase().trim();
  if (!q) return null;

  if (q.includes('top') || q.includes('best') || q.includes('sell') || q.includes('popular')) {
    if (!bi.topItems.length) return 'No completed order items yet — place a sample order to unlock top seller rankings!';
    return `Top sellers: ${bi.topItems.slice(0, 3).map((i, idx) => `#${idx + 1} ${i.name} (${i.qty} sold, ₹${i.revenue})`).join(' • ')}.`;
  }
  if (q.includes('cash') || q.includes('online') || q.includes('upi') || q.includes('payment')) {
    const total = (stats.todayCash + stats.todayOnline) || 1;
    const onlinePct = Math.round((stats.todayOnline / total) * 100);
    return `Today's split: Cash ₹${stats.todayCash} (${100 - onlinePct}%) vs Online/UPI ₹${stats.todayOnline} (${onlinePct}%).`;
  }
  if (q.includes('time') || q.includes('prep') || q.includes('speed') || q.includes('wait')) {
    return `Average kitchen prep speed is ${bi.avgPrepMinutes} minutes per ticket. Peak traffic hour is ${bi.peakHour}.`;
  }
  if (q.includes('rating') || q.includes('feedback') || q.includes('review') || q.includes('happy')) {
    return `Average customer rating is ${bi.avgRating}★ across ${feedbacksCount} reviews (${bi.positiveRate}% positive sentiment).`;
  }
  if (q.includes('revenue') || q.includes('sales') || q.includes('today') || q.includes('month')) {
    return `Revenue summary — Today: ₹${stats.todayRev} (${stats.todayOrders} orders) • This Month: ₹${stats.monthRev} • This Year: ₹${stats.yearRev}.`;
  }

  return `Snapshot: Today ₹${stats.todayRev} across ${stats.todayOrders} orders • Avg prep ${bi.avgPrepMinutes}m • Rating ${bi.avgRating}★ • ${bi.topItems[0] ? `Top item: ${bi.topItems[0].name}` : 'Ready for orders'}.`;
};

