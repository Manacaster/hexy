// HEXY.PRO App - /app/src/pages/FAQ.jsx - Page component that displays frequently asked questions.
 

const FAQ = () => {
  return (
    <div className="container mx-auto mt-8">
      <h1 className="text-3xl font-bold mb-4">Frequently Asked Questions</h1>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">What is HexyPro?</h2>
          <p>HexyPro is an amazing application that does amazing things.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold">How do I get started?</h2>
          <p>Simply register for an account and start exploring!</p>
        </div>
        {/* Add more FAQ items as needed */}
      </div>
    </div>
  );
};

export default FAQ;