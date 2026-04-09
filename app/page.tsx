"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { User } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, Shield, UserCheck, Clock, Database, AlertCircle, CheckCircle, Fingerprint } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandInput,
  CommandList,
  CommandEmpty,
} from "@/components/ui/command";

const HomePage: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [checktime, setChecktime] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [dbLoading, setDbLoading] = useState<boolean>(true);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [password, setPassword] = useState<string>("");
  const [passwordVerified, setPasswordVerified] = useState<boolean>(false);
  const [allowedUsers, setAllowedUsers] = useState<User[]>([]);

  const sensorId = "1";
  const SN = "A5NS190560046";

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("/api/users");
        const users = response.data;

        const formattedUsers = users.map((user: { userid: number , name: string}) => ({
          USERID: user.userid,
          Name: user.name,
          SENSORID: sensorId,
          VERIFCODE: SN,
        }));
        setAllowedUsers(formattedUsers);
      } catch (error) {
        toast.error("Failed to fetch users from the server.");
      }
    };

    fetchUsers();

    const checkDatabaseConnection = async () => {
      setDbLoading(true);
      try {
        await axios.get("/api/users");
        setDbConnected(true);
        toast.success("Connected to the database!");
      } catch (error) {
        setDbConnected(false);
        toast.error("Failed to connect to the database.");
      } finally {
        setDbLoading(false);
      }
    };

    checkDatabaseConnection();
  }, []);

  const handleChecktimeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setChecktime(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedUser || !checktime) {
      setSubmitError(
        "Please select a user and enter a check-in/check-out time."
      );
      return;
    }

    try {
      setLoading(true);

      const localDate = new Date(checktime);
      const jakartaTime = new Date(localDate.getTime() + 7 * 60 * 60 * 1000);
      const formattedDate = jakartaTime
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      await axios.post("/api/users", {
        userId: selectedUser.USERID,
        checktime: formattedDate,
        sensorId: sensorId,
        sn: SN,
      });

      setSubmitSuccess("Success");
      setSubmitError(null);
    } catch (error) {
      setSubmitError("Failed to submit data.");
      setSubmitSuccess(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const correctPassword = "2027";
    if (password === correctPassword) {
      setPasswordVerified(true);
    } else {
      toast.error("Incorrect password.");
    }
  };

  if (!passwordVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-3xl"></div>
        <Card className="w-[420px] relative z-10 bg-white/95 backdrop-blur-xl border-0 shadow-2xl rounded-2xl overflow-hidden mx-4">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500"></div>
          <CardHeader className="pt-8 pb-4">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-4 shadow-xl">
                <Shield className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-800">Security Access</h1>
            <p className="text-center text-gray-500 text-sm">Please verify your identity</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Access Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 border-gray-300 focus:border-purple-500 focus:ring-purple-500 rounded-xl text-secondary"
                    placeholder="Enter your password"
                    autoFocus
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-semibold shadow-lg text-white"
                >
                  Verify Access
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6 pt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-3">
            <Fingerprint className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Antikeri
          </h1>
          <p className="text-gray-500 text-sm mt-1">Attendance Management System</p>
        </div>

        {/* Main Card */}
        <Card className="border-0 shadow-xl rounded-2xl overflow-hidden bg-white">
          {/* Status Bar */}
          <div className="px-6 pt-4">
            {dbLoading && (
              <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3 border border-blue-100">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-blue-700">Checking database connection...</span>
              </div>
            )}
            {dbConnected === false && !dbLoading && (
              <div className="bg-red-50 rounded-xl p-3 flex items-center gap-3 border border-red-100">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-700">Failed to connect to database</span>
              </div>
            )}
            {submitError && (
              <div className="bg-red-50 rounded-xl p-3 flex items-center gap-3 border border-red-100">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-700">{submitError}</span>
              </div>
            )}
            {submitSuccess && (
              <div className="bg-green-50 rounded-xl p-3 flex items-center gap-3 border border-green-100">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-700">Attendance recorded successfully!</span>
              </div>
            )}
          </div>

          <CardContent className="p-6 space-y-5">
            {/* User Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Select Employee
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-12 border-2 hover:border-blue-400 rounded-xl transition-all"
                  >
                    <span className={selectedUser ? "text-gray-800 font-medium" : "text-gray-400"}>
                      {selectedUser ? selectedUser.Name : "Choose employee..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[340px] p-0 rounded-xl shadow-xl" align="start">
                  <Command>
                    <CommandInput placeholder="Search employee..." />
                    <CommandList>
                      <CommandEmpty>No employee found.</CommandEmpty>
                      <CommandGroup>
                        {allowedUsers.map((user) => (
                          <CommandItem
                            key={user.USERID}
                            value={user.Name}
                            onSelect={(currentValue) => {
                              setSelectedUser(
                                allowedUsers.find(
                                  (user) => user.Name === currentValue
                                ) || null
                              );
                            }}
                            className="cursor-pointer"
                          >
                            <Check
                              className="mr-2 h-4 w-4 text-green-500"
                              style={{
                                opacity:
                                  selectedUser?.Name === user.Name ? "100" : "0",
                              }}
                            />
                            {user.Name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Selected User Info */}
            {selectedUser && (
              <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Selected Employee</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1.5 rounded-lg">
                        <span className="font-semibold">{selectedUser.Name}</span>
                      </Badge>
                      <p className="text-xs text-gray-500 mt-2">ID: {selectedUser.USERID}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Time Input */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Check-in Time
                    </label>
                    <Input
                      type="datetime-local"
                      value={checktime}
                      onChange={handleChecktimeChange}
                      className="w-full h-11 border-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400 rounded-xl text-secondary"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl font-semibold shadow-lg transition-all duration-200 text-white"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </span>
                    ) : (
                      "Submit Attendance"
                    )}
                  </Button>
                </form>
              </div>
            )}
          </CardContent>

          {/* Footer */}
          <CardFooter className="bg-gray-50/50 border-t px-6 py-3">
            <div className="flex items-center justify-between w-full text-xs text-gray-500">
              <span>Sensor: {sensorId}</span>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <span>SN: {SN}</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;