'use client'
import React, { useState } from 'react';
import { Activity, MessageSquare, Shield, Users } from 'lucide-react';

export default function WAGatewayDashboard() {
  const [stats] = useState({
    activeNumbers: 1,
    messagesSent: 45,
    successRate: 100,
    bannedNumbers: 0
  });

  return (
    <div className="p-8 bg-gray-50 min-h-screen text-black">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Safe WA Gateway</h1>
          <p className="text-gray-500">Anti-Ban & Rate Limiter Dashboard</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          + Add WhatsApp Number
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* STAT CARDS */}
        <div className="bg-white p-6 rounded-lg shadow-sm border flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-full text-blue-600"><Users size={24} /></div>
          <div><p className="text-sm text-gray-500 font-medium">Active Numbers</p><h3 className="text-2xl font-bold">{stats.activeNumbers}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-full text-green-600"><MessageSquare size={24} /></div>
          <div><p className="text-sm text-gray-500 font-medium">Messages Sent</p><h3 className="text-2xl font-bold">{stats.messagesSent}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border flex items-center space-x-4">
          <div className="p-3 bg-purple-100 rounded-full text-purple-600"><Shield size={24} /></div>
          <div><p className="text-sm text-gray-500 font-medium">Success Rate</p><h3 className="text-2xl font-bold">{stats.successRate}%</h3></div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border flex items-center space-x-4">
          <div className="p-3 bg-red-100 rounded-full text-red-600"><Activity size={24} /></div>
          <div><p className="text-sm text-gray-500 font-medium">Banned Numbers</p><h3 className="text-2xl font-bold">{stats.bannedNumbers}</h3></div>
        </div>
      </div>

      {/* TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-bold mb-4">Connected Sessions</h2>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr><th className="px-4 py-3">Number</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Trust Score</th></tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-gray-50">
                <td className="px-4 py-4 font-medium">+62 812-3456-7890</td>
                <td className="px-4 py-4"><span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">CONNECTED</span></td>
                <td className="px-4 py-4"><div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-green-600 h-2.5 rounded-full" style={{width:'85%'}}></div></div></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-bold mb-4">Live Queue</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
              <div><p className="text-sm font-medium">To: +62811223344</p><p className="text-xs text-gray-500">Injecting ZWC...</p></div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">PROCESS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
