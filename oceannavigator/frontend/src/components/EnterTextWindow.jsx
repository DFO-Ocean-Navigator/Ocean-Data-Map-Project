import React, { useState } from "react";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

function EnterTextWindow(props) {
  const [inputText, setInputText] = useState("");

  const onSubmit = () => {
    props.mapRef.current.addAnnotationLabel(inputText)
    props.updateUI({ modalType: "", showModal: false });
    console.log(inputText)
  };

  return (
    <Form>
      <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
        <Form.Label>Add Annotation Label</Form.Label>
        <Form.Control
          type="text"
          onChange={(e) => setInputText(e.target.value)}
        />
        <Button onClick={onSubmit}>
          Submit
        </Button>
      </Form.Group>
    </Form>
  );
}

export default EnterTextWindow;
