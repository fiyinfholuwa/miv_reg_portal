export const images = {
  hero: '/images/photos/lp-hero.webp',
  church: '/images/church-building.jpeg',
  crowd: '/images/photos/lp-hero-m.webp',
  speaker: '/images/photos/lp-about-1.webp',
  worship: '/images/photos/lp-about-2.webp',
  venue: '/images/church-building.jpeg',
  hotel: '/images/photos/lp-hotel.webp',
  audience: '/images/publicity/flyer-preview.jpg',
  teaching: '/images/photos/lp-about-1.webp',
  hosts: '/images/mummy-and-daddy.png',
  samson: '/images/photos/lp-host-1.webp',
  stella: '/images/photos/lp-host-2.webp',
  registration: '/images/photos/lp-reg.webp',
};

export const schedule = {
  Tue: [
    ['5:00 PM', 'Opening night', 'Main hall', 'A room full of expectation and worship.'],
    ['7:30 PM', 'Ministers dedication', 'Main hall', 'An opening word for the days ahead.'],
  ],
  Wed: [
    ['8:30 AM', 'Morning plenary', 'Main hall', 'A practical start for leaders and teams.'],
    ['5:00 PM', 'Breakout sessions', 'Breakout halls · Zoom', 'Focused rooms for deeper conversation.'],
    ['7:30 PM', 'Evening worship', 'Main hall', 'Gathering around the presence of God.'],
  ],
  Thu: [
    ['9:00 AM', 'The Royal Conference', 'Main hall', 'A focused track for kingdom leadership.'],
    ['2:00 PM', 'Youth & young leaders', 'Youth pavilion', 'New voices, new friendships, shared purpose.'],
  ],
  Fri: [
    ['9:00 AM', 'Main leadership plenary', 'Main hall', 'Teaching for the work in front of you.'],
    ['6:00 PM', 'Commissioning service', 'Main hall', 'A night of prayer, blessing, and sending.'],
  ],
  Sat: [
    ['10:00 AM', 'Missions forum', 'Breakout halls', 'Stories and strategies from the field.'],
    ['5:30 PM', 'Closing celebration', 'Main hall', 'Celebrate what God has done and what comes next.'],
  ],
};

export type ScheduleKey = keyof typeof schedule;

export const media = [
  { title: 'Opening night', duration: '0:48', image: images.hero },
  { title: 'Worship highlights', duration: '1:12', image: images.worship },
  { title: 'Breakout sessions', duration: '0:35', image: images.teaching },
  { title: 'Royal Conference', duration: '0:56', image: images.audience },
];

export const testimonials = [
  ['The breakout on church planting gave our team a clear plan. We have started two outreach cells since the conference.', 'Rev. Daniel O.', 'Ilorin · IMLC 2026', images.samson],
  ['I watched online from Accra. The stream held all week and the radio option saved my data.', 'Abena K.', 'Accra · Online delegate', images.worship],
  ['My first IYLC. I made friends from five states and found my place in missions.', 'Tobi E.', 'Lagos · IYLC 2026', images.speaker],
  ['Registration and badge collection took less than ten minutes. Everything was in order.', 'Mrs. Ngozi U.', 'Enugu · Delegate', images.stella],
];

export const ministers = [
  { name: 'Rev. Samson Ajetomobi', role: 'Host · President, MIV', image: images.samson, status: 'Confirmed' },
  { name: 'Rev. Mrs Stella Ajetomobi', role: 'Host · Vice-President, MIV', image: images.stella, status: 'Confirmed' },
  { name: 'Guest minister', role: 'Speaker announcement coming soon', image: '/images/miv-logo.png', status: 'To be announced' },
  { name: 'Guest minister', role: 'Speaker announcement coming soon', image: '/images/miv-logo.png', status: 'To be announced' },
];

export const merch = [
  { name: 'Revival hoodie', price: '₦20,000', image: '/images/merch/revival-hoodie.jpg', tag: 'Limited set' },
  { name: 'Revival polo', price: '₦13,000', image: '/images/merch/revival-polo-navy.jpg', tag: 'Official merch' },
  { name: 'Revival baseball shirt', price: '₦16,000', image: '/images/merch/revival-baseball.jpg', tag: 'Faith collection' },
  { name: 'Revival T-shirt', price: '₦13,000', image: '/images/merch/revival-tee.jpg', tag: 'New' },
];

export const gallery = [
  ['The room', images.crowd],
  ['The word', images.teaching],
  ['The worship', images.worship],
  ['The venue', images.hotel],
  ['The conference', images.audience],
  ['The gathering', images.hero],
  ['Samson', images.samson],
  ['Stella', images.stella],
];

export const faqs = [
  ['Is registration really free?', 'Yes. Registration is free for physical and online attendance. Reserve your pass so we can send you the latest programme and access information.'],
  ['Who can attend the conference?', 'Ministers, leaders, young people, teams, and anyone who wants to grow in faith and leadership are welcome.'],
  ['Where is the conference taking place?', 'The conference will hold at Leadership & Missions Conference Centre, Olororo, Ojoo, Ibadan, Nigeria.'],
  ['Can I attend online?', 'Yes. Online access, livestream, and remote breakout information will be shared with registered delegates.'],
  ['Will accommodation be available?', 'Vetted lodging options and on-site accommodation information will be released as availability is confirmed.'],
  ['What should I bring?', 'Bring your registration confirmation, a Bible, a notebook, comfortable clothing, and an expectant heart.'],
];
