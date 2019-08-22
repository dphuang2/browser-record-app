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
  totalTime,
  setNewPlayPercentage,
  playing,
  controllerRef,
  setPlaying,
}) => {

  const shouldUpdate = useRef(true);
  const wasPlaying = useRef(true);
  const progressBarRef = useRef();
  const [markerPosition, setMarkerPosition] = useState({x: 0, y: 0});
  const [currentTime, setCurrentTime] = useState(0);

  /*
   *We want to make sure that the playing state changes while dragging
   */
  const handleMarkerStart = () => {
    wasPlaying.current = playing;
    setPlaying(false);
    shouldUpdate.current = false;
  }

  /*
   *For progress bar width update
   */
  const handleMarkerDrag = (event, data) => {
    setMarkerPosition({x: data.x, y: 0});
  }

  const handleMarkerStop = (event, data) => {
    const { width } = progressBarRef.current.getBoundingClientRect();
    const newPercentageWatched = data.x / width;
    const position = {x: newPercentageWatched * width, y: 0};
    setNewPlayPercentage(newPercentageWatched);
    setMarkerPosition(position);
    setPlaying(wasPlaying.current);
    setCurrentTime(newPercentageWatched * totalTime);
    shouldUpdate.current = true;
  }

  const handleNewPercentageWatchedOrResize = () => {
    if (!shouldUpdate.current) return;
    const { width } = progressBarRef.current.getBoundingClientRect();
    const position = {x: clamp(percentageWatched, 0, 1.0) * width, y: 0};
    setMarkerPosition(position);
  }

  const handlePlayButtonClick = (event) => {
    const target = event.target;
    setPlaying(target.checked);
  }

  // move marker when resize happens
  useEffect(() => {
    window.addEventListener('resize', handleNewPercentageWatchedOrResize);
    return () => {
      window.removeEventListener('resize', handleNewPercentageWatchedOrResize);
    } 
  }, []);

  // Reflect percentage watched on the controller from displayer
  useEffect(() => {
    handleNewPercentageWatchedOrResize();
    setCurrentTime(percentageWatched * totalTime);
    if (percentageWatched >= 1) setPlaying(false);
  }, [percentageWatched]);

  const twoPad = (x) => {
    return ("00" + x).substr(-2);
  }

  const millisecondsToMinutes = (milliseconds) => {
    return twoPad(Math.floor((milliseconds / 1000) / 60));
  }

  const millisecondsToSeconds = (milliseconds) => {
    return twoPad(Math.floor((milliseconds / 1000) % 60));
  }

  return (
    <div ref={controllerRef} className="controller">
      <div className="progress-bar-wrapper">
        <div ref={progressBarRef} className="progress-bar" />
        <div className="play-progress" />
        <Draggable
          axis="x"
          bounds="parent"
          position={markerPosition}
          onStart={handleMarkerStart}
          onDrag={handleMarkerDrag}
          onStop={handleMarkerStop}
        >
          <div className="marker" />
        </Draggable>
      </div>
      <div className="controls">
        <span className="time-display"> 
          {millisecondsToMinutes(currentTime)}
          {':'}
          {millisecondsToSeconds(currentTime)}
          {' / '}
          {millisecondsToMinutes(totalTime)}
          {':'}
          {millisecondsToSeconds(totalTime)}
        </span>
        <input type="checkbox" checked={playing} onChange={handlePlayButtonClick} />
      </div>
      <style jsx>
        {`

    .controls {
      width: auto;
      position: absolute;
      bottom: calc((100% - ${progressBarHeight}px) / 2);
      left: 50%;
      transform: translate(-50%, 50%);
    }

    .time-display {
      color:white;
    }

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
      background: ${progressBarBackground};

      position: absolute;
      left: 50%;
      transform: translate(-50%, 0);
    }

    .play-progress {
      width: ${markerPosition.x + (markerSize / 2)}px;
      height: 100%;
      background: ${progressColor};
      position: absolute;
      left: 0;
    }

    .marker {
      width: ${markerSize}px;
      height: ${markerSize}px;
      background: ${progressColor};
      border-radius: ${markerSize / 2}px;
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
  totalTime: PropTypes.number.isRequired,
  setNewPlayPercentage: PropTypes.func.isRequired,
  controllerRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  setPlaying: PropTypes.func.isRequired,
  playing: PropTypes.bool.isRequired,
}

export default Controller;
