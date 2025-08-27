// Test script to verify voice listing endpoint
async function testVoicesEndpoint() {
  try {
    console.log('🔍 Testing voice listing endpoint...');
    
    const response = await fetch('http://localhost:3002/api/audio?intent=list_voices');
    const result = await response.json();
    
    console.log('📊 Response status:', response.status);
    console.log('📋 Response data:', JSON.stringify(result, null, 2));
    
    if (result.success && result.data) {
      console.log('✅ Voice endpoint working correctly!');
      console.log(`📢 Found ${result.data.length} voices:`);
      result.data.forEach((voice, index) => {
        console.log(`  ${index + 1}. ${voice.name} (${voice.gender})`);
      });
    } else {
      console.log('❌ Voice endpoint failed:', result.error);
    }
  } catch (error) {
    console.error('💥 Error testing voice endpoint:', error);
  }
}

testVoicesEndpoint();
