// 프로필 / 스타일 드롭다운 옵션 (스크린샷 기준)

export const AGE_OPTIONS = [
  { value: "", label: "연령대 자동 랜덤" },
  { value: "20대", label: "20대" },
  { value: "30대", label: "30대" },
  { value: "40대", label: "40대" },
  { value: "50대", label: "50대" },
];

export const GENDER_OPTIONS = [
  { value: "", label: "성별 자동 랜덤" },
  { value: "남성", label: "남성" },
  { value: "여성", label: "여성" },
];

export const JOB_OPTIONS = [
  { value: "", label: "직업 자동 랜덤" },
  { value: "직장인", label: "직장인" },
  { value: "프리랜서", label: "프리랜서" },
  { value: "자영업자", label: "자영업자" },
  { value: "공무원", label: "공무원" },
  { value: "취준생", label: "취준생" },
  { value: "대학생", label: "대학생" },
  { value: "대학원생", label: "대학원생" },
  { value: "주부", label: "주부" },
  { value: "육아맘", label: "육아맘" },
  { value: "워킹맘", label: "워킹맘" },
  { value: "초보아빠", label: "초보 아빠" },
  { value: "아르바이트생", label: "아르바이트생" },
  { value: "군인", label: "군인" },
];

export const SITUATION_OPTIONS = [
  { value: "", label: "상황 자동 랜덤" },
  { value: "퇴근후", label: "퇴근 후" },
  { value: "출근길", label: "출근길" },
  { value: "점심시간", label: "점심시간" },
  { value: "야근중", label: "야근 중" },
  { value: "주말아침", label: "주말 아침" },
  { value: "주말저녁", label: "주말 저녁" },
  { value: "평일아침", label: "평일 아침" },
  { value: "평일저녁", label: "평일 저녁" },
  { value: "아침운동", label: "아침 운동" },
  { value: "다이어트중", label: "다이어트 중" },
  { value: "생일당일", label: "생일 당일" },
  { value: "기념일", label: "기념일" },
  { value: "친구랑같이", label: "친구랑 같이" },
];

export const POST_TYPE_OPTIONS = [
  { value: "후기성", label: "후기성 글" },
  { value: "정보성", label: "정보성 글" },
];

export const STRUCTURE_OPTIONS = [
  { value: "", label: "구조 랜덤 선택 자동 랜덤" },
  { value: "스토리텔링", label: "스토리텔링 형식" },
  { value: "브이로그", label: "브이로그 일기체" },
  { value: "리뷰중심", label: "리뷰 중심 구조" },
  { value: "정보정리형", label: "정보 정리형" },
  { value: "체험후기", label: "체험 후기 구조" },
  { value: "광고협찬", label: "광고/협찬에 적합한 구조" },
];

export const CHAR_COUNT_OPTIONS = [
  { value: 800, label: "짧게 (800자 내외)" },
  { value: 1200, label: "보통 (1200자 내외)" },
  { value: 1600, label: "길게 (1600자 내외)" },
  { value: 2000, label: "아주 길게 (2000자 내외)" },
];