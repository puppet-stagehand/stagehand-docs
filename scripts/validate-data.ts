import { loadCompatibility } from '../src/lib/data/compatibility';
import { loadTiers } from '../src/lib/data/tiers';

const tiers = loadTiers();
const compatibility = loadCompatibility();

console.log(`Validated ${tiers.length} tiers and ${compatibility.length} compatibility records`);
