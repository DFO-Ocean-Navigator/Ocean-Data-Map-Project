import React, { useState, useEffect } from "react";

import { Button, Modal } from "react-bootstrap";
import Card from "react-bootstrap/Card";
import Table from "react-bootstrap/Table";
import { X } from "react-bootstrap-icons";

function EnterCoordsModal(props) {
  const [coordinates, setCoordinates] = useState([]);
  const [enteredLat, setEnteredLat] = useState(null);
  const [enteredLon, setEnteredLon] = useState(null);
  const [tableEntries, setTableEntries] = useState([]);

  useEffect(() => {
    setTableEntries(
      props.pointCoordinates.map((coord, index) => {
        return (
          <tr key={`entry_${coord[0]}_${coord[1]}`}>
            <td>{coord[0]}</td>
            <td>{coord[1]}</td>
            <td>
              <button
                className="removeCoord"
                onClick={() => props.action("removePoint", index)}
              >
                <X />
              </button>
            </td>
          </tr>
        );
      })
    );
  }, [props.pointCoordinates]);

  const submitHandler = (e) => {
    e.preventDefault();
    if (enteredLat & enteredLon) {
      props.action("addPoint", [enteredLat, enteredLon]);
      setEnteredLat(null);
      setEnteredLon(null);
    }
  };

  const latChangeHandler = (e) => {
    setEnteredLat(parseFloat(e.target.value));
  };

  const lonChangeHandler = (e) => {
    setEnteredLon(parseFloat(e.target.value));
  };

  const handleClear = () => {
    props.action("clearPoints");
  };

  return (
    <Modal
      show={true}
      onHide={props.handleClose}
      size="xl"
      style={{ opacity: 1 }}
      dialogClassName="coords-modal-dialog"
    >
      <Modal.Header closeButton>
        <Modal.Title>Enter Coordinates</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Card>
          <Card.Body>
            <Table striped bordered size="sm">
              <thead>
                <tr>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th style={{ width: "5%" }}></th>
                </tr>
              </thead>
              <tbody>{tableEntries}</tbody>
            </Table>

            <form onSubmit={submitHandler}>
              <div style={{ display: "flex", justifyContent: "right" }}>
                <label>Latitude:</label>
                <input
                  type="number"
                  min="-90"
                  max="90"
                  step="0.0001"
                  value={enteredLat}
                  onChange={latChangeHandler}
                />
                <label>Longitude:</label>
                <input
                  type="number"
                  min="-180"
                  max="180"
                  step="0.0001"
                  value={enteredLon}
                  onChange={lonChangeHandler}
                />
                <button type="submit">Add</button>
                <button type="button" onClick={handleClear}>
                  Clear
                </button>
              </div>
            </form>
          </Card.Body>
        </Card>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary">Upload Coordinates</Button>
        <Button variant="primary" onClick={props.handleClose}>
        Apply
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default EnterCoordsModal;
