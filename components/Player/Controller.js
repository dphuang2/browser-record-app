import { useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import PropTypes from 'prop-types';

const markerSize = 13;
const progressBarHeight = 5;
const progressColor = '#f00';
const progressBarBackground = 'rgba(255,255,255,.2)';

function clamp(x, min, max) {
  return Math.min(Math.max(x, min), max);
}

const Controller = ({
  percentageWatched,
  setNewPlayPercentage,
  controllerRef,
}) => {

  const progressBarRef = useRef();
  const [markerPosition, setMarkerPosition] = useState({x: 0, y: 0});

  const handleMarkerDrag = (event, data) => {
    console.log({x: data.x});
  }
  
  const handleMarkerStop = (event, data) => {
    const { width } = progressBarRef.current.getBoundingClientRect();
    setMarkerPosition(data.x);
    setNewPlayPercentage(data.x / width);
  }

  const handleMarkerChange = () => {
    const { width } = progressBarRef.current.getBoundingClientRect();
    const position = {x: clamp(percentageWatched, 0, 1.0) * width, y: 0};
    setMarkerPosition(position);
  }

  useEffect(() => {
    window.addEventListener('resize', handleMarkerChange);
    return () => window.removeEventListener('resize', handleMarkerChange);
  }, [handleMarkerChange]);

  useEffect(() => {
    handleMarkerChange();
  }, [handleMarkerChange, percentageWatched]);

  return (
    <div ref={controllerRef} className="controller">
      <div className="progress-bar-wrapper">
        <div ref={progressBarRef} className="progress-bar" />
        <Draggable
          axis="x"
          bounds="parent"
          position={markerPosition}
          onStart={handleMarkerDrag}
          onStop={handleMarkerStop}
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
      height: 5%;
      background: rgba(0, 0, 0, 0.3);
      display: block;
      z-index: 9999999;
    }

    .progress-bar-wrapper {
      width: calc(100% - 50px);
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
      left: 0px;
      position: absolute;
    }
        `}
      </style>
    </div>
  );
};

Controller.propTypes = {
  percentageWatched: PropTypes.number.isRequired,
}

export default Controller;
