import { atom } from "recoil";
import { recoilPersist } from "recoil-persist";

// データの永続化
const { persistAtom } = recoilPersist({
	key: "recoil-persist",
	storage: sessionStorage
});

export interface AnswerState {
  id: number;
  answer: number;
}

export interface UserInfoState {
  user_id: string;
  join_date: string;
  join_time: string;
  condition: string;
}

export interface OriginalAnswerState {
  id: number;
  answer: string;
}

export interface AfterExpAnswerState {
  id: string;
  answer: string;
}

export interface ProductDescriptionState {
  satisfaction: number;
  guilt: number;
  ownership: number;
  honesty: number;
  freeText: string;
}

export interface PreTaskAnswer {
  answer1: string;
  answer2: string;
  answer3: string;
}

export interface PostTaskAnswer {
  answer1: string;
  answer2: string;
  answer3: string;
}

export const userInfoAnswerState = atom<UserInfoState>({
  key: "user-info-answer",
  default: {
    user_id: "",
    join_date: "",
    join_time: "",
    condition: "",
  },
  effects_UNSTABLE: [persistAtom],
});

export const preTaskAnswerState = atom<PreTaskAnswer>({
  key: 'pre-task-answer',
  default: {
    answer1: "",
    answer2: "",
    answer3: ""
  },
  effects_UNSTABLE: [persistAtom],
});

export const productDescriptionAnswerState = atom<ProductDescriptionState>({
  key: 'product-description-answers',
  default: {} as ProductDescriptionState,
  effects_UNSTABLE: [persistAtom],
});

export const nasaTLXAnswerState = atom<AnswerState[]>({
  key: 'nasa-tlx-answers', // unique ID (with respect to other atoms/selectors)
  default: [] as AnswerState[], // default value (aka initial value)
  effects_UNSTABLE: [persistAtom], // データの永続化
});

export const susAnswerState = atom<AnswerState[]>({
  key: 'sus-answers', // unique ID (with respect to other atoms/selectors)
  default: [] as AnswerState[], // default value (aka initial value)
  effects_UNSTABLE: [persistAtom], // データの永続化
});

export const postTaskAnswerState = atom<PostTaskAnswer>({
  key: 'post-task-answer',
  default: {
    answer1: "",
    answer2: "",
    answer3: ""
  },
  effects_UNSTABLE: [persistAtom],
});
