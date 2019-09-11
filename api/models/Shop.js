import { Schema } from 'mongoose';
import { avoidOverwriteModelError } from '../../utils/db';

const shopSchema = new Schema({
    shop: String,
    appSubscriptionId: String,
});

export default avoidOverwriteModelError('Shop', shopSchema);
