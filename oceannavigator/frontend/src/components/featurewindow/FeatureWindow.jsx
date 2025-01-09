import React, { useState, useEffect } from "react";

import Card from "react-bootstrap/Card";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";

function FeatureWindow(props) {
  return (
    <div className="feature-window">
      <div className="feature-window-header"><Button>X</Button></div>
      <div className="feature-window-content">
        <Card style={{ width: "18rem" }}>
          <Card.Img variant="top" src="holder.js/100px180" />
          <Card.Body>
            <Card.Title>Test</Card.Title>
            <Card.Text>
              Some quick example text to build on the card title and make up the
              bulk of the card's content.
            </Card.Text>
            <Button variant="primary">Go somewhere</Button>
          </Card.Body>
        </Card>
      </div>
      <div className="feature-window-footer">
        <Button>Add</Button>
      </div>
    </div>
  );
}

export default FeatureWindow;
