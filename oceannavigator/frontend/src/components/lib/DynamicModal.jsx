import React, { useState } from "react";
import Modal from "react-bootstrap/Modal";
import ModalDialog from "react-bootstrap/ModalDialog";
import Draggable from "react-draggable";
import { Resizable } from "re-resizable";

function DraggableModalDialog(props) {
  return (
    <Draggable handle=".modal-title">
      <ModalDialog {...props} />
    </Draggable>
  );
}

function DynamicModal(props) {
  const [showModal, setShowModal] = useState(true);

  return (
    <Modal
      show={showModal}
      onHide={() => setShowModal(!showModal)}
      dialogAs={DraggableModalDialog}
    >
      <Resizable
        className="modal-resizable"
        defaultSize={{ width: "auto", height: "auto" }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Title</Modal.Title>
        </Modal.Header>
        <Modal.Body>Body</Modal.Body>
        <Modal.Footer>Footer</Modal.Footer>
      </Resizable>
    </Modal>
  );
}

export default DynamicModal;