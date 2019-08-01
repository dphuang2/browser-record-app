import { useState } from 'react';
import Draggable from 'react-draggable';

const markerSize = 13;
const progressBarHeight = 5;
const progressColor = '#f00';
const progressBarBackground = 'rgba(255,255,255,.2)';

const Controller = ({
  percentageWatched,
  controllerRef,
  setPercentageWatched,
}) => {

  const handleMarkerDrag = (event, data) => {
    console.log({x: data.x});
  }

  return (
    <div ref={controllerRef} className="controller">
      <div className="progress-bar-wrapper">
        <div className="progress-bar" />
        <Draggable
          axis="x"
          bounds="parent"
          onStart={handleMarkerDrag}
          onStop={handleMarkerDrag}
        >
          <div className="marker" />
        </Draggable>
      </div>


      <style jsx>
        {`
    .controller {
      position: fixed;
      bottom: 0;
      width: 100%;
      height: 10%;
      background: rgba(0, 0, 0, 0.3);
      display: block;
      z-index: 9999999;
    }

    .progress-bar-wrapper {
      width: calc(100% - 20px);
      height: ${progressBarHeight}px;
      top: 0px;

      position: absolute;
      left: 50%;
      transform: translate(-50%, 0);
    }

    .progress-bar {
      width: calc(100% - ${markerSize}px);
      height: 100%;
      background: ${progressColor};

      position: absolute;
      left: 50%;
      transform: translate(-50%, 0);
    }

    .marker {
      width: ${markerSize}px;
      height: ${markerSize}px;
      background: ${progressColor};
      border-radius: ${markerSize}px;
      top: -${markerSize / 4}px;
      left: -${markerSize / 4}px;
      position: absolute;
    }
        `}
      </style>
    </div>
  );
};

export default Controller;
