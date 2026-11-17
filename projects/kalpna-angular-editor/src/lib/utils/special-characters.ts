/** Special characters grouped by category: [character, name]. */
export interface KalpnaCharCategory {
  name: string;
  chars: [string, string][];
}

const c = (s: string, names: string): [string, string][] => {
  const chars = Array.from(s);
  const n = names.split('|');
  return chars.map((ch, i) => [ch, n[i] ?? ch]);
};

export const SPECIAL_CHARACTERS: KalpnaCharCategory[] = [
  {
    name: 'Text',
    chars: c('‹›«»‘’“”‚„†‡…‰ˆ˜–—¡¿•§¶©®™°№', 'single left angle|single right angle|left guillemet|right guillemet|left single quote|right single quote|left double quote|right double quote|low single quote|low double quote|dagger|double dagger|ellipsis|per mille|caret|tilde|en dash|em dash|inverted exclamation|inverted question|bullet|section|pilcrow|copyright|registered|trademark|degree|numero')
  },
  {
    name: 'Mathematical',
    chars: c('<>≤≥–—¯‾°−±÷⁄×ƒ∫∑∞√∼≅≈≠≡∈∉∋∏∧∨¬∩∪∂∀∃∅∇∗∝∠¼½¾¹²³', 'less than|greater than|less or equal|greater or equal|en dash|em dash|macron|overline|degree|minus|plus-minus|division|fraction slash|multiplication|function|integral|n-ary sum|infinity|square root|tilde operator|approximately equal|almost equal|not equal|identical|element of|not element of|contains|n-ary product|logical and|logical or|not|intersection|union|partial differential|for all|there exists|empty set|nabla|asterisk operator|proportional|angle|one quarter|one half|three quarters|superscript one|superscript two|superscript three')
  },
  {
    name: 'Currency',
    chars: c('₹$€£¥¢₩₽₺₦₱₫₪₴₡₲₵₸₿¤', 'Indian rupee|dollar|euro|pound|yen|cent|won|ruble|lira|naira|peso|dong|shekel|hryvnia|colon|guarani|cedi|tenge|bitcoin|currency')
  },
  {
    name: 'Arrows',
    chars: c('←↑→↓↔↕↖↗↘↙⇐⇑⇒⇓⇔⇕↩↪↺↻➔➜➝➞', 'left|up|right|down|left right|up down|north west|north east|south east|south west|double left|double up|double right|double down|double left right|double up down|hook left|hook right|anticlockwise|clockwise|heavy right|heavy round right|triangle right|heavy triangle right')
  },
  {
    name: 'Latin',
    chars: c('ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØŒŠÙÚÛÜÝŸÞßàáâãäåæçèéêëìíîïðñòóôõöøœšùúûüýÿþ', '')
  },
  {
    name: 'Greek',
    chars: c('ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω', 'Alpha|Beta|Gamma|Delta|Epsilon|Zeta|Eta|Theta|Iota|Kappa|Lambda|Mu|Nu|Xi|Omicron|Pi|Rho|Sigma|Tau|Upsilon|Phi|Chi|Psi|Omega|alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega')
  },
  {
    name: 'Devanagari',
    chars: c('०१२३४५६७८९।॥ॐऽ॰ंःँ़्ॅॉ₹', 'zero|one|two|three|four|five|six|seven|eight|nine|danda|double danda|om|avagraha|abbreviation|anusvara|visarga|chandrabindu|nukta|virama|candra e|candra o|rupee')
  },
  {
    name: 'Symbols',
    chars: c('★☆✓✔✗✘☐☑☒♠♣♥♦♪♫☀☁☂☎✉✂✎⚠⚡☺☻♀♂∴∵', 'black star|white star|check|heavy check|ballot x|heavy ballot x|ballot box|ballot box checked|ballot box x|spade|club|heart|diamond|note|notes|sun|cloud|umbrella|telephone|envelope|scissors|pencil|warning|high voltage|smile|black smile|female|male|therefore|because')
  }
];

export const EMOJI_CATEGORIES: KalpnaCharCategory[] = [
  { name: 'Smileys', chars: c('😀😃😄😁😆😅😂🤣😊😇🙂🙃😉😌😍🥰😘😋😛😜🤪🤓😎🤩🥳😏😒😞😔😟😕🙁😣😖😫😩🥺😢😭😤😠😡🤯😳🥵🥶😱😨😰😥😓🤗🤔🤭🤫😶😐😑😬🙄😯😴🤤😷🤒🤕', '') },
  { name: 'Gestures', chars: c('👍👎👌✌🤞🤟🤘👈👉👆👇☝✋🤚🖐🖖👋🤙💪🙏👏🙌🤝✍', '') },
  { name: 'Hearts', chars: c('❤🧡💛💚💙💜🖤🤍🤎💔❣💕💞💓💗💖💘💝', '') },
  { name: 'Nature', chars: c('🌸🌺🌻🌼🌷🌹🌱🌿🍀🍁🍂🌳🌴🌵🌞🌝🌛⭐🌟✨⚡🔥🌈☀⛅🌧❄☔🌊🐶🐱🐭🐰🦊🐻🐼🐯🦁🐮🐷🐸🐵🐔🐧🐦🦋🐝🐘🐄', '') },
  { name: 'Food', chars: c('🍎🍊🍋🍌🍉🍇🍓🍒🍑🥭🍍🥥🥝🍅🥕🌽🌶🥔🍞🧀🍳🍕🍔🍟🌭🥪🌮🍛🍚🍜🍲🍥🍰🎂🍫🍬🍭🍮🍯☕🍵🥤🍺', '') },
  { name: 'Objects', chars: c('📱💻⌨🖥🖨🖱💾📷📹🎥📞☎📺📻⏰⌛📡🔋🔌💡🔦📔📕📖📗📘📙📚📓📒📃📄📰📑🔖💰💳✉📧📦📝✏🖊📌📍📎✂🔒🔓🔑🔨🛠⚙', '') },
  { name: 'Activities', chars: c('⚽🏀🏈⚾🎾🏐🏏🏑🏓🏸🥊🎯⛳🎣🎽🎿🏆🥇🥈🥉🏅🎖🎗🎫🎟🎪🎭🎨🎬🎤🎧🎼🎹🥁🎷🎺🎸🎻🎲♟🎮🎉🎊🎁🎈🪔🪁', '') },
  { name: 'Symbols', chars: c('✅❌❗❓⭕🚫💯🔴🟠🟡🟢🔵🟣⚫⚪🔶🔷🔺🔻▶⏸⏹⏺⏭⏮🔁🔀➕➖➗✖♻⚜🔱📛🔰⭐🆕🆓🆗🆙🔝🔜', '') },
  { name: 'Flags', chars: [['🇮🇳', 'India'], ['🇺🇸', 'United States'], ['🇬🇧', 'United Kingdom'], ['🇯🇵', 'Japan'], ['🇩🇪', 'Germany'], ['🇫🇷', 'France'], ['🇦🇺', 'Australia'], ['🇨🇦', 'Canada'], ['🏳', 'White flag'], ['🏁', 'Chequered flag'], ['🚩', 'Red flag']] }
];
