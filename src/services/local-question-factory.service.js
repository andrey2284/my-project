const categoryBlueprints = [
  {
    category: 'ip_addressing',
    title: 'Адресация в нестандартной подсети',
    prompt: ({ companyContext }) =>
      `В ${companyContext} филиал перевели на новую адресацию 10.44.18.0/27. В этой же подсети уже работают принтеры, IP-телефоны и один старый NAS со статическим адресом. Объясни по шагам, как ты проверишь, хватает ли адресов, как избежишь конфликтов и как будешь распределять адреса между устройствами.`
  },
  {
    category: 'routing',
    title: 'Потеря связи между офисами',
    prompt: ({ companyContext }) =>
      `В ${companyContext} внезапно пропал доступ между главным офисом и филиалом. Используется статическая маршрутизация, а пограничные роутеры — MikroTik. С какими проверками ты начнёшь диагностику, в каком порядке и какие выводы будешь делать на каждом этапе?`
  },
  {
    category: 'vlan',
    title: 'Новая VLAN без потери доступа',
    prompt: ({ companyContext }) =>
      `В ${companyContext} нужно вынести IP-камеры в отдельную VLAN, но коммутаторы уже обслуживают рабочие станции и телефонию. Расскажи, как ты подготовишь изменение, какие риски учтёшь и как поймёшь, что трафик действительно изолирован правильно.`
  },
  {
    category: 'arp_dhcp',
    title: 'Конфликт ARP и DHCP',
    prompt: ({ companyContext }) =>
      `В ${companyContext} несколько сотрудников жалуются: сеть то работает, то пропадает. Похоже, в сети появился "левый" DHCP-сервер, а ARP-таблицы ведут себя нестабильно. Объясни, какие признаки ты будешь искать и как локализуешь проблему.`
  },
  {
    category: 'dns',
    title: 'DNS работает не у всех',
    prompt: ({ companyContext }) =>
      `В ${companyContext} часть сотрудников открывает сайты по IP, но не по имени. Другие пользователи работают нормально. Разбери, как ты отделишь DNS-проблему от общей сетевой, какие команды и проверки применишь и что будешь считать подтверждением гипотезы.`
  },
  {
    category: 'osi_tcp_udp',
    title: 'OSI и транспорт на практике',
    prompt: ({ companyContext }) =>
      `В ${companyContext} приложение жалуется на "обрывы сети", но пинг до сервера проходит. На примере модели OSI объясни, на каких уровнях может быть проблема, почему пинг этого не доказывает, и как ты бы проверял TCP и UDP-сценарии по-разному.`
  }
];

const normalizeCompanyContext = (companyContext) =>
  companyContext?.trim()
    ? companyContext.trim()
    : 'нашей компании сеть построена на оборудовании MikroTik, а часть настроек унаследована от старого подрядчика';

export const buildFallbackQuestions = ({ totalQuestions, companyContext, model }) => {
  const normalizedContext = normalizeCompanyContext(companyContext);

  return Array.from({ length: totalQuestions }).map((_, index) => {
    const blueprint = categoryBlueprints[index % categoryBlueprints.length];
    return {
      order: index + 1,
      title: blueprint.title,
      prompt: blueprint.prompt({ companyContext: normalizedContext }),
      category: blueprint.category,
      expectedSignals: [
        'Структурированная диагностика',
        'Понимание сетевых основ',
        'Умение объяснять причинно-следственные связи',
        'Приоритизация шагов проверки'
      ],
      source: 'fallback',
      model
    };
  });
};
