import { Paper, TextField, Typography } from "@mui/material";
import { useRecoilState } from "recoil";
import { useEffect, useState } from "react";
import { preTaskAnswerState } from "./store/answerState";

interface PreTaskAnswer {
  answer1: string;
  answer2: string;
  answer3: string;
}

const PreTaskQuestion = () => {
  const [answers, setAnswers] = useState<PreTaskAnswer>({
    answer1: "",
    answer2: "",
    answer3: ""
  });
  const [formAnswer, setFormAnswer] = useRecoilState(preTaskAnswerState);

  useEffect(() => {
    if (formAnswer) {
      setAnswers(formAnswer as PreTaskAnswer);
    }
  }, [formAnswer]);

  const handleChange = (field: keyof PreTaskAnswer) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const newAnswers = { ...answers, [field]: value };
    setAnswers(newAnswers);
    setFormAnswer(newAnswers);
  };

  return (
    <Paper
      style={{ margin: "20px auto", padding: "20px", maxWidth: "800px" }}
    >
      <Typography variant="body1" paragraph>
      商品を「できるだけ高い値段で売る」ために、商品説明文ではどんな点が大切だと思いますか？<br></br>
      重要だと思うことを、3つ書いてください。
      </Typography>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <TextField
          multiline
          rows={3}
          fullWidth
          variant="outlined"
          value={answers.answer1}
          onChange={handleChange('answer1')}
          placeholder="1つ目の重要なポイントを入力してください"
        />
        <TextField
          multiline
          rows={3}
          fullWidth
          variant="outlined"
          value={answers.answer2}
          onChange={handleChange('answer2')}
          placeholder="2つ目の重要なポイントを入力してください"
        />
        <TextField
          multiline
          rows={3}
          fullWidth
          variant="outlined"
          value={answers.answer3}
          onChange={handleChange('answer3')}
          placeholder="3つ目の重要なポイントを入力してください"
        />
      </div>
    </Paper>
  );
};

export default PreTaskQuestion;
