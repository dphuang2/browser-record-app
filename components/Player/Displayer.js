import {
  useEffect,
  useState,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import { Replayer } from 'rrweb';

const Displayer = ({
  percentageWatched,
  setPercentageWatched,
  replay,
  displayerRef 
}) => {
  const wrapperRef = useRef();
  const [scale, setScale] = useState();
  const [availableWidth, setAvailableWidth] = useState();
  const [availableHeight, setAvailableHeight] = useState();
  const [contentWidth, setContentWidth] = useState();
  const [contentHeight, setContentHeight] = useState();
  const [replayer, setReplayer] = useState();
  const [animationFrameGlobalId, setAnimationFrameGlobalId] = useState();

  const setAvailableDimensions = () => {
    if (!wrapperRef || !wrapperRef.current) return;
    const { width, height } = wrapperRef.current.getBoundingClientRect();
    setAvailableWidth(width);
    setAvailableHeight(height);
  };

  const updatePercentageWatched = () => {
    if (replayer) {
      console.log('timeoffset: ', replayer.getTimeOffset);
      console.log('totalTime: ', replay.duration);
      setPercentageWatched(replayer.getTimeOffset() / replay.duration);
    }
    const globalId = window.requestAnimationFrame(updatePercentageWatched)
    setAnimationFrameGlobalId(globalId);
  }
  
  useEffect(() => {
    const replayer = new Replayer(replay.events, {
      root: displayerRef.current,
    });
    replayer.play();
    replayer.on('resize', (event) => {
      setContentWidth(event.width);
      setContentHeight(event.height);
      setAvailableDimensions();
    });
    setReplayer(replayer);
    const globalId = window.requestAnimationFrame(updatePercentageWatched)
    setAnimationFrameGlobalId(globalId);
    window.addEventListener('resize', setAvailableDimensions);
    return () => {
      window.removeEventListener('resize', setAvailableDimensions);
      window.cancelAnimationFrame(animationFrameGlobalId);
    };
  }, []);

  useEffect(() => {
    // Scale iframe wrapper based on available width/height and content
    // width/height. Also account for browser lack of precision for transform
    // CSS property by decreasing available width and height.
    setScale(Math.min(
      (availableWidth - 7) / contentWidth,
      (availableHeight - 7) / contentHeight,
    ));
  }, [availableWidth, availableHeight, contentWidth, contentHeight]);

  return (
    <div ref={wrapperRef} className="wrapper">
      <div
        className="display"
        ref={displayerRef}
      />
      <style jsx>
        {`
.wrapper {
  position: absolute;
  width: 90%;
  height: 90%;
  top:45%;
  left:50%;
  transform: translate(-50%,-50%);
}
.display {
  background: white;
  position: fixed;
  transform-origin: 0 0;
  left: 50%;
  transform: translate(-${50 * scale}%, -${50 * scale}%) scale(${scale});
  top: 50%;
}
          `}
      </style>
      <style jsx global>
        {`
iframe {
  border: none;
  pointer-events: none;
}
`}
      </style>
    </div>
  );
};

Displayer.propTypes = {
  replay: PropTypes.shape({
    events: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
};

export default Displayer;
