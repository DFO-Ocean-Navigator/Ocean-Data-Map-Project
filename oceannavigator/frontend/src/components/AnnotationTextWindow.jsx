import React, { useState } from "react";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

function AnnotationTextWindow(props) {
  const [inputText, setInputText] = useState("");

  const onSubmit = () => {
    props.mapRef.current.addAnnotationLabel(inputText)
    props.updateUI({ modalType: "", showModal: false });
  };

  const onUndo = () =>{
    props.mapRef.current.undoAnnotationLabel()
  }

  const onClear = () => {
    props.mapRef.current.clearAnnotationLabels()
  }

  return (
    <Form>
      <Form.Group>
        <Form.Label>Annotation Text</Form.Label>
        <Form.Control
          type="text"
          onChange={(e) => setInputText(e.target.value)}
        />
        <Button onClick={onSubmit}>
          Add
        </Button>
        <Button onClick={onUndo}>
          Undo
        </Button>
        <Button onClick={onClear}>
          Clear
        </Button>                
      </Form.Group>
    </Form>
  );
}

export default AnnotationTextWindow;
