import { Link } from 'react-router';
import { PageHeading } from '../../components/ui/index.tsx';

export function Component() {
  return <div className="mx-auto max-w-[800px] px-5 py-24"><p className="mb-6 text-[13px] tabular-nums text-ink-3">404</p><PageHeading title="This page isn’t on the record." kn="ಈ ಪುಟ ಲಭ್ಯವಿಲ್ಲ." description="The link may have changed. The civic map is a good place to start." /><Link to="/map" className="mt-8 inline-flex min-h-12 items-center rounded-pill bg-primary px-6 text-[15px] font-medium text-on-primary">Open the civic map</Link></div>;
}
