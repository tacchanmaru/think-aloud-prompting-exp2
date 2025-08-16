import { FC, ReactNode, useEffect, useRef, useState } from "react";
import {
  nasaTLXAnswerState,
  susAnswerState,
  userInfoAnswerState,
  productDescriptionAnswerState,
  preTaskAnswerState,
  postTaskAnswerState,
} from "./store/answerState";
import { useRecoilValue } from "recoil";
import { Button, Divider, Paper, Typography } from "@mui/material";
import styled from "@emotion/styled";
import { sub_color } from "./color";
import { setDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import { useNavigate } from "react-router-dom";
import PreTaskQuestion from "./preTaskQuestion";
import SUSQuestion from "./SUSQuestion";
import NasaTLXQuestion from "./NasaTLXQuestion";
import ProductDescriptionQuestion from "./ProductDescriptionQuestion";
import { nasa_tlx_list, sus_list } from "./constraints";
import PostTaskImportantPoints from "./PostTaskImportantPoints";
import FreeDescriptionQuestion from "./FreeDescriptionQuestion";

const Container = styled.div`
  min-height: 100vh;
  padding: 10vh 10vw;
  background-color: ${sub_color};
  margin: auto;
`;

const CompletionPage = () => {
  return (
    <Paper style={{ margin: "20px auto", padding: "40px", maxWidth: "800px", textAlign: "center" }}>
      <Typography variant="h5" gutterBottom>
        タスク前の質問は終わりです
      </Typography>
      <Typography variant="body1" style={{ marginTop: "20px" }}>
        実験監督者にお伝えください
      </Typography>
    </Paper>
  );
};

function App() {
  const navigate = useNavigate();

  const userinfo_answer = useRecoilValue(userInfoAnswerState);
  const nasa_tlx_result = useRecoilValue(nasaTLXAnswerState);
  const sus_result = useRecoilValue(susAnswerState);
  const pre_task_answer = useRecoilValue(preTaskAnswerState);
  const post_task_answer = useRecoilValue(postTaskAnswerState);
  const product_description_answer = useRecoilValue(productDescriptionAnswerState);

  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const topref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const page_log = localStorage.getItem("page");
    if (page_log) setPage(parseInt(page_log));
    setLoading(true);
  }, []);

  useEffect(() => {
    if (loading) localStorage.setItem("page", page.toString());
  }, [page, loading]);

  const toBeforePage = () => {
    if (page > 0) setPage((page) => page - 1);
    topref.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toAfterPage = () => {
    if (page == 0) {
      if (!pre_task_answer.answer1 || !pre_task_answer.answer2 || !pre_task_answer.answer3) {
        alert("タスク前の質問に回答してください。");
        return;
      }
    } else if (page == 1) {
      alert("タスク後の質問に移動します。");
    } else if (page == 2) {
      if (!post_task_answer.answer1 || !post_task_answer.answer2 || !post_task_answer.answer3) {
        alert("タスク後の質問①に回答してください。");
        return;
      }
    } else if (page == 3) {
      if (sus_result.length !== sus_list.length) {
        alert("タスク後の質問②（SUS）に回答してください。");
        return;
      }
    } else if (page == 4) {
      if (nasa_tlx_result.length !== nasa_tlx_list.length) {
        alert("タスク後の質問③（NASA-TLX）に回答してください。");
        return;
      }
    } else if (page == 5) {
      if (!product_description_answer.satisfaction || !product_description_answer.guilt || 
          !product_description_answer.ownership || !product_description_answer.honesty) {
        alert("タスク後の質問④（商品説明文）に回答してください。");
        return;
      }
    } else if (page == 6) {
      if (!product_description_answer.freeText) {
        alert("タスク後の質問⑤（自由記述）に回答してください。");
        return;
      }
    }
    setPage((page) => page + 1);
    topref.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendAnswer = async () => {
    if (
      nasa_tlx_result.length !== nasa_tlx_list.length ||
      sus_result.length !== sus_list.length ||
      !product_description_answer.satisfaction || !product_description_answer.guilt || 
      !product_description_answer.ownership || !product_description_answer.honesty
    ) {
      alert("回答が完了していません。");
      return;
    }
    const doc_id = new Date().toISOString();
    try {
      await setDoc(doc(db, "answers", doc_id), {
        user_info: {
          user_id: userinfo_answer.user_id,
          condition: userinfo_answer.condition
        },
        pre_task: pre_task_answer,
        post_task: post_task_answer,
        nasa_tlx: nasa_tlx_result,
        sus: sus_result,
        product_description: product_description_answer,
        timestamp: new Date(),
      });
      console.log("Document written with ID: ", doc_id);
      // alert("送信が完了しました。");
      navigate("/end");
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("送信に失敗しました。");
    }
  };

  const renderSUSQuestions = () => {
    return (
      <>
        <Paper
          style={{ margin: "20px auto", padding: "20px", maxWidth: "800px" }}
        >
          <Typography variant="h5" gutterBottom>
            システム使用性評価（SUS）
          </Typography>
          <Typography variant="body1" paragraph>
            実験中に使用したツールについて以下の質問に回答してください。長時間考えることはせず、各質問文を読んでその場で思ったことを回答してください。
          </Typography>
        </Paper>
        {sus_list.map((sus) => {
          return (
            <Paper
              style={{
                margin: "20px auto",
                padding: "20px",
                maxWidth: "800px",
              }}
              key={sus.id}
            >
              <SUSQuestion {...sus} />
            </Paper>
          );
        })}
      </>
    );
  };

  const renderNasaTLXQuestions = () => {
    return (
      <>
        <Paper
          style={{ margin: "20px auto", padding: "20px", maxWidth: "800px" }}
        >
          <Typography variant="h5" gutterBottom>
            タスク負荷評価（NASA-TLX）
          </Typography>
          <div>
            赤い線を動かして、以下の質問に回答してください。
            <br />
            クリックすると赤い線が現れます。
            ドラッグで赤い線を動かすことも可能です。
          </div>
          <NasaTLXQuestion
            id={-1}
            name="記入例"
            description=""
            min="小さい"
            max="大きい"
          />
        </Paper>
        {nasa_tlx_list.map((nasa_tlx) => {
          return (
            <Paper
              style={{
                margin: "20px auto",
                padding: "20px",
                maxWidth: "800px",
              }}
              key={nasa_tlx.id}
            >
              <NasaTLXQuestion {...nasa_tlx} />
            </Paper>
          );
        })}
      </>
    );
  };

  const pages = [
    <PreTaskQuestion />,
    <CompletionPage />,
    <PostTaskImportantPoints />,
    renderSUSQuestions(),
    renderNasaTLXQuestions(),
    <ProductDescriptionQuestion />,
    <FreeDescriptionQuestion />,
  ];

  const pageTitles = [
    "タスク前の質問",
    "タスク前の質問（完了）",
    "タスク後の質問①",
    "タスク後の質問②",
    "タスク後の質問③",
    "タスク後の質問④",
    "タスク後の質問⑤",
  ];

  const lastPage = pages.length - 1;

  return (
    <Container>
      <Paper
        ref={topref}
        elevation={3}
        style={{
          margin: page == 1 ? "20px auto" : "20px auto",
          padding: "10px",
          maxWidth: "800px",
        }}
      >
        {pageTitles[page]}
      </Paper>
      {pages.map((p, i) => {
        return <Page isShow={page === i}>{p}</Page>;
      })}

      <Divider />
      <div style={{ margin: "20px auto", maxWidth: "800px", display: "flex" }}>
        {page > 0 && page !== 1 && (
          <Paper
            style={{ margin: "10px", padding: "10px", width: "50%" }}
            onClick={toBeforePage}
          >
            <Button> {"<<"} 前へ</Button>
          </Paper>
        ) || (
          <div style={{ margin: "10px", padding: "10px", width: "50%" }}></div>
        )}
        {page === lastPage ? (
          <Paper style={{ margin: "10px", padding: "10px", width: "50%" }}>
            <Button onClick={sendAnswer}>送信</Button>
          </Paper>
        ) : (
          <Paper
            style={{ margin: "10px", padding: "10px", width: "50%" }}
            onClick={toAfterPage}
          >
            <Button>次へ {">>"}</Button>
          </Paper>
        )}
      </div>
    </Container>
  );
}

const Page: FC<{ isShow: boolean; children: ReactNode }> = ({
  children,
  isShow,
}) => {
  return <div style={{ display: isShow ? "block" : "none" }}>{children}</div>;
};

export default App;
