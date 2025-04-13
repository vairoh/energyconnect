export function Footer() {
  return (
    <footer className="bg-white">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex justify-center md:justify-start">
            <a href="/" className="text-primary font-medium">EnergyPro Community</a>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="flex space-x-6 justify-center md:justify-end">
              <a href="#" className="text-gray-400 hover:text-gray-500">
                <span className="text-sm">About</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-500">
                <span className="text-sm">Privacy</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-500">
                <span className="text-sm">Terms</span>
              </a>
            </div>
          </div>
        </div>
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} EnergyPro GmbH. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
