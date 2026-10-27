export const imageBase = 'https://images.unsplash.com/';

export const images = {
  hero: `${imageBase}photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=85`,
  church: '/images/church-building.jpeg',
  crowd: `${imageBase}photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85`,
  speaker: `${imageBase}photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1000&q=85`,
  worship: `${imageBase}photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=85`,
  venue: `${imageBase}photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=85`,
  audience: `${imageBase}photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1000&q=85`,
  teaching: `${imageBase}photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1000&q=85`,
  hosts: '/images/mummy-and-daddy.png',
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
  ['The breakout on church planting gave our team a clear plan. We have started two outreach cells since the conference.', 'Rev. Daniel O.', 'Ilorin · IMLC 2026'],
  ['I watched online from Accra. The stream held all week and the radio option saved my data.', 'Abena K.', 'Accra · Online delegate'],
  ['My first IYLC. I made friends from five states and found my place in missions.', 'Tobi E.', 'Lagos · IYLC 2026'],
  ['Registration and badge collection took less than ten minutes. Everything was in order.', 'Mrs. Ngozi U.', 'Enugu · Delegate'],
];

export const ministers = [
  { name: 'Rev. Samson Ajetomobi', role: 'Host · President, MIV', image: images.hosts, status: 'Confirmed' },
  { name: 'Rev. Mrs Stella Ajetomobi', role: 'Host · Vice-President, MIV', image: images.hosts, status: 'Confirmed' },
  { name: 'Guest minister', role: 'Speaker announcement coming soon', image: images.church, status: 'To be announced' },
  { name: 'Guest minister', role: 'Speaker announcement coming soon', image: images.audience, status: 'To be announced' },
];

export const merch = [
  { name: 'Executive polo', price: '₦12,500', image: images.crowd, tag: 'Official merch' },
  { name: 'Hoodie + cap set', price: '₦25,000', image: images.hero, tag: 'Limited set' },
  { name: 'Conference T-shirt', price: '₦8,000', image: images.worship, tag: 'New' },
  { name: 'Psalm 23 jersey', price: '₦15,000', image: images.audience, tag: 'Faith collection' },
];

export const gallery = [
  ['The room', images.crowd],
  ['The word', images.teaching],
  ['The worship', images.worship],
  ['The gathering', images.audience],
  ['The venue', images.church],
  ['The next generation', images.hero],
];

export const faqs = [
  ['Is registration really free?', 'Yes. Registration is free for physical and online attendance. Reserve your pass so we can send you the latest programme and access information.'],
  ['Who can attend the conference?', 'Ministers, leaders, young people, teams, and anyone who wants to grow in faith and leadership are welcome.'],
  ['Where is the conference taking place?', 'The conference will hold at Leadership & Missions Conference Centre, Olororo, Ojoo, Ibadan, Nigeria.'],
  ['Can I attend online?', 'Yes. Online access, livestream, and remote breakout information will be shared with registered delegates.'],
  ['Will accommodation be available?', 'Vetted lodging options and on-site accommodation information will be released as availability is confirmed.'],
  ['What should I bring?', 'Bring your registration confirmation, a Bible, a notebook, comfortable clothing, and an expectant heart.'],
];
