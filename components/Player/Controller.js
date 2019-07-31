import {
  ProgressBar,
} from '@shopify/polaris';
import PropTypes from 'prop-types';
import { forwardRef } from 'react';

const Controller = forwardRef((props, ref) => (
  <div ref={ref} className="controller">
    <ProgressBar progress={50} />
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
    `}
    </style>
    <style jsx global>
      {`
.Polaris-ProgressBar {
border-radius: 0;
}
`}
    </style>
  </div>
));

Controller.propTypes = {
  ref: PropTypes.elementType.isRequired,
};

export default Controller;
