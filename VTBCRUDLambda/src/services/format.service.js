export function formatSearchToHTML(search) {
  const isActive = search.active ? 'Yes' : 'No';
  const minPrice = search.minPrice ? `\n<b>MIN PRICE:</b> ${search.minPrice}` : '';
  const maxPrice = search.maxPrice ? `\n<b>MAX PRICE:</b> ${search.maxPrice}` : '';
  const statusIds = Array.from(search?.statusIds || []).join(', ');
  const statusIdsText = `\n<b>STATUS IDS:</b> ${statusIds ? statusIds : 'All'}`;

  const mainText = `<b>ALIAS:</b> ${search.alias} \n<b>IS ACTIVE:</b> ${isActive} \n<b>SEARCH TERM:</b> ${search.searchTerm} \n<b>SEARCH ID:</b> ${search.searchId}`;
  const filters = `${minPrice} ${maxPrice} ${statusIdsText}`;

  return `${mainText} ${filters}`;
}

export function formatStatusIds(statusIds) {
  if (!statusIds) return new Set(['']);

  const validStatusIds = ['1', '2', '3', '4', '5'];
  const statusIdsArray = statusIds.split(',').map(id => id.trim());

  return new Set(statusIdsArray.includes('all')
    ? ['']
    : statusIdsArray.filter(id => validStatusIds.includes(id)));
}
