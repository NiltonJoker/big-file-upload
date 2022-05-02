import React, { useEffect, useState } from "react";
import { ProgressBar, Form, Card, Container } from "react-bootstrap";
import axios from "axios";

const chunkSize = 1048576 * 100; //its 3MB, increase the number measure in mb
const API_URL = 'http://localhost:89'


function Upload() {
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileState, setFileState] = useState({
    fileSize: 0,
    fileId: "",
    totalChunks: 0,
    totalChunksUploaded: 0,
    startChunk: 0,
    endChunk: chunkSize,
    fileToUpload: null,
    uploadedBytes: 0,
  });

  const [fileName, setFileName] = useState("")

  const progressInstance = (
    <>
      {
        progress < 100 
        ? 
        (
          <h5 className="text-center">
            Por favor no cierre la ventana mientras se sube su archivo ni tampoco actualize la ventana
          </h5>
        )
        :
        (
          <h5 className="text-center">
            Su archivo {fileName} ha sido subido correctamente
          </h5>
        )
      }
      <ProgressBar
        variant={progress.toFixed(3) < 100 ? "primary" : "success"}
        animated={progress.toFixed(3) < 100 ? true : false}
        now={progress}
        label={`${
          progress.toFixed(3) < 100 ? progress.toFixed(3) + "%" : "Completado"
        }`}
      />
    </>
  );

  useEffect(() => {
    if (fileState.fileSize > 0) {
      fileUpload(fileState.totalChunksUploaded);
    }
  }, [fileState.fileSize, fileState.totalChunksUploaded]);

  const getFileContext = (e) => {
    setShowProgress(true);
    setProgress(0);
    resetState();
    const file_obj = e.target.files[0];
    const fileId = `${file_obj.size}-${file_obj.lastModified}-${file_obj.name}`;
    setFileName(file_obj.name);
    axios
      .get(`${API_URL}/upload/status`, {
        headers: {
          "x-file-name": fileId,
          "file-size": file_obj.size,
        },
      })
      .then(({ data }) => {
        const uploadedBytes = data.uploaded;
        console.log("uploaded bbytes ", uploadedBytes);
        const bytesRemaining = file_obj.size - uploadedBytes;
        const endingChunk = Math.min(uploadedBytes + chunkSize, file_obj.size);
        setFileState({
          fileSize: file_obj.size,
          fileId,
          totalChunks: Math.ceil(bytesRemaining / chunkSize),
          totalChunksUploaded: 0,
          startChunk: uploadedBytes,
          endChunk:
            endingChunk === fileState.fileSize ? endingChunk + 1 : endingChunk,
          fileToUpload: file_obj,
          uploadedBytes,
        });
      })
      .catch((err) => console.error("Status call failed ", err));
  };

  const fileUpload = (totalChunksUploaded) => {
    const { totalChunks, fileToUpload, startChunk, endChunk, fileId } =
      fileState;
    if (totalChunksUploaded <= totalChunks) {
      var chunk = fileToUpload.slice(startChunk, endChunk);
      uploadChunk(chunk);
    } else {
      axios
        .post(`${API_URL}/upload/complete`, {
          headers: {
            "x-file-name": fileId,
          },
        })
        .then(resetState);
    }
  };

  const uploadChunk = (chunk) => {
    console.table({ ...fileState, fileToUpload: "" });
    const {
      fileId,
      startChunk,
      endChunk,
      fileSize,
      totalChunksUploaded,
      uploadedBytes,
    } = fileState;
    axios
      .post(`${API_URL}/upload/files`, chunk, {
        headers: {
          "x-file-name": fileId,
          "Content-Range": `bytes ${startChunk}-${endChunk}/${fileSize}`,
          "file-size": fileSize,
        },
      })
      .then(({ data }) => {
        const endingChunk = Math.min(endChunk + chunkSize, fileSize);

        setFileState({
          ...fileState,
          totalChunksUploaded: totalChunksUploaded + 1,
          startChunk: endChunk,
          endChunk: endingChunk === fileSize ? endingChunk + 1 : endingChunk,
          uploadedBytes: endingChunk,
        });
        const prog = fileSize ? (uploadedBytes / fileSize) * 100 : 0.1;
        setProgress(prog);
        if (prog === 100) {
          resetFileInput();
        }
      });
  };

  const resetState = () => {
    setFileState({
      fileSize: 0,
      fileId: "",
      totalChunks: 0,
      totalChunksUploaded: 0,
      startChunk: 0,
      endChunk: chunkSize,
      fileToUpload: null,
      uploadedBytes: 0,
    });
  };

  const resetFileInput = () => {
    document.querySelector("#exampleFormControlFile1").value = "";
  };

  return (
    <Container
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <Card style={{ width: "50rem" }}>
        <Card.Header className="text-center bg-dark text-white fw-bold">
          Subida de Archivos
        </Card.Header>
        <Card.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Control
                id="exampleFormControlFile1"
                onChange={getFileContext}
                type="file"
                disabled={ progress > 0 && progress < 100 ? true : false}
              />
            </Form.Group>
            <Form.Group style={{ display: showProgress ? "block" : "none" }}>
              {progressInstance}
            </Form.Group>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Upload;
